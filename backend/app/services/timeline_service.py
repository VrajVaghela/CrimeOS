"""Timeline Agent service.

Responsible for:
1. Synthesizing a chronological timeline from all existing case data (Gemini).
2. Analyzing CCTV footage frames and pinning them on the timeline (Gemini Vision).
3. Accepting officer notes and inserting them as manual timeline events.

Architecture rules honoured:
- All Gemini calls go through gemini_client — never direct.
- All prompts imported from prompts.py as named constants.
- Every state-changing function ends with audit_service.record() before commit.
- Every AI call has a deterministic fallback so the demo cannot die.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ai import gemini_client
from app.ai.prompts import CCTV_ANALYSIS_PROMPT, TIMELINE_SYNTHESIS_PROMPT
from app.exceptions import GenerationError
from app.models import (
    AuditEvent,
    Case,
    Complaint,
    ExtractedEntity,
    InvestigationPath,
    LegalRequest,
    PathStep,
    ProviderResponse,
    TimelineEvent,
)
from app.schemas.timeline import (
    CctvAnalysisOut,
    OfficerNoteIn,
    SynthesizedEventItem,
    TimelineSynthesisOut,
)
from app.services import audit_service

logger = logging.getLogger("crime_os.timeline")

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_or_synthesize_timeline(
    db: Session,
    case_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[TimelineEvent]:
    """Return all timeline events for a case.

    On first call (no events exist yet) the service synthesizes an initial
    timeline from case data using Gemini and persists the result.
    """
    existing = _load_events(db, case_id)
    if existing:
        return existing

    # First call — synthesize from case data
    synthesized = _synthesize_from_case_data(db, case_id)
    for item in synthesized:
        occurred = _parse_iso(item.occurred_at) or datetime.now(timezone.utc)
        event = TimelineEvent(
            case_id=case_id,
            occurred_at=occurred,
            event_type=item.event_type,
            title=item.title,
            description=item.description,
            location=item.location,
            confidence=0.85,
            source_ref={"type": "ai_synthesis"},
            ai_generated=True,
        )
        db.add(event)

    db.flush()
    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="timeline_synthesized",
        detail={"event_count": len(synthesized)},
    )
    db.commit()
    return _load_events(db, case_id)


def analyze_cctv_and_pin(
    db: Session,
    case_id: uuid.UUID,
    evidence_file_id: uuid.UUID | None,
    frame_bytes: bytes,
    mime_type: str,
    user_id: uuid.UUID,
) -> tuple[TimelineEvent, CctvAnalysisOut]:
    """Analyze a CCTV frame via Gemini Vision and pin a timeline event."""

    # Run Gemini CCTV analysis with deterministic fallback
    analysis = _run_cctv_analysis(db, frame_bytes, mime_type)

    # Derive occurred_at from the OSD timestamp if parseable, else now
    occurred_at = _parse_osd_timestamp(analysis.detected_timestamp) or datetime.now(timezone.utc)

    location = analysis.location_description if analysis.location_description != "Indeterminate location" else None

    event = TimelineEvent(
        case_id=case_id,
        occurred_at=occurred_at,
        event_type="cctv_frame",
        title=f"CCTV Frame — {analysis.location_description[:60]}" if location else "CCTV Frame Analyzed",
        description=_build_cctv_description(analysis),
        location=location,
        confidence=analysis.confidence,
        source_ref={
            "type": "cctv_frame",
            "evidence_file_id": str(evidence_file_id) if evidence_file_id else None,
        },
        ai_generated=True,
        evidence_file_id=evidence_file_id,
        cctv_analysis=analysis.model_dump(),
    )
    db.add(event)
    db.flush()

    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="cctv_frame_pinned",
        detail={
            "event_id": str(event.id),
            "location": location,
            "confidence": analysis.confidence,
            "forensic_flags": analysis.forensic_flags,
        },
    )
    db.commit()
    db.refresh(event)
    return event, analysis


def add_officer_note(
    db: Session,
    case_id: uuid.UUID,
    body: OfficerNoteIn,
    user_id: uuid.UUID,
) -> TimelineEvent:
    """Insert an officer-entered note as a timeline event."""
    case = db.get(Case, case_id)
    if not case:
        raise ValueError("Case not found")

    event = TimelineEvent(
        case_id=case_id,
        occurred_at=body.occurred_at,
        event_type="officer_note",
        title=body.title,
        description=body.description,
        location=body.location,
        confidence=None,
        source_ref={"type": "officer_note"},
        ai_generated=False,
    )
    db.add(event)
    db.flush()

    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="officer_note_added",
        detail={"event_id": str(event.id), "title": body.title},
    )
    db.commit()
    db.refresh(event)
    return event


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _load_events(db: Session, case_id: uuid.UUID) -> list[TimelineEvent]:
    return list(
        db.scalars(
            select(TimelineEvent)
            .where(TimelineEvent.case_id == case_id)
            .order_by(TimelineEvent.occurred_at.asc())
        )
    )


def _synthesize_from_case_data(
    db: Session, case_id: uuid.UUID
) -> list[SynthesizedEventItem]:
    """Assemble case context and call TIMELINE_SYNTHESIS_PROMPT via Gemini."""

    case = db.get(Case, case_id)
    if not case:
        return []

    # Complaints
    complaints = list(
        db.scalars(
            select(Complaint)
            .options(selectinload(Complaint.entities))
            .where(Complaint.case_id == case_id)
        )
    )
    complaint_summary = ""
    entity_lines: list[str] = []
    complaint_filed_at = case.created_at.isoformat()
    if complaints:
        c = complaints[0]
        complaint_filed_at = c.created_at.isoformat()
        complaint_summary = (c.translated_text or c.raw_text or "")[:800]
        for e in c.entities:
            entity_lines.append(f"  - {e.entity_type}: {e.value} (conf: {e.confidence:.2f})")

    # Path steps
    path = db.scalar(
        select(InvestigationPath)
        .options(selectinload(InvestigationPath.steps))
        .where(InvestigationPath.case_id == case_id)
    )
    step_lines: list[str] = []
    if path:
        for s in sorted(path.steps, key=lambda x: x.step_order):
            step_lines.append(f"  - Step {s.step_order}: {s.title} [{s.status}]")

    # Legal requests
    requests = list(
        db.scalars(select(LegalRequest).where(LegalRequest.case_id == case_id))
    )
    request_lines: list[str] = []
    response_received_at = "None"
    for r in requests:
        dispatched = r.dispatched_at.isoformat() if r.dispatched_at else "pending"
        request_lines.append(f"  - {r.provider_type} / {r.provider_name} — {r.status} at {dispatched}")
        # Also look for provider responses
        resp = db.scalar(
            select(ProviderResponse).where(ProviderResponse.legal_request_id == r.id)
        )
        if resp:
            response_received_at = resp.received_at.isoformat()

    # Audit events (last 20)
    audit_events = list(
        db.scalars(
            select(AuditEvent)
            .where(AuditEvent.case_id == case_id)
            .order_by(AuditEvent.created_at.asc())
            .limit(20)
        )
    )
    audit_lines = [
        f"  [{e.created_at.isoformat()}] {e.action}: {json.dumps(e.detail)[:120]}"
        for e in audit_events
    ]

    prompt = TIMELINE_SYNTHESIS_PROMPT.format(
        case_title=case.title,
        case_number=case.case_number,
        crime_type=case.crime_type or "Unknown",
        complaint_filed_at=complaint_filed_at,
        complaint_summary=complaint_summary or "No complaint text available.",
        extracted_entities="\n".join(entity_lines) or "None",
        path_steps="\n".join(step_lines) or "None",
        legal_requests="\n".join(request_lines) or "None",
        response_received_at=response_received_at,
        audit_events="\n".join(audit_lines) or "None",
    )

    # Deterministic fallback — always generates something useful
    fallback = TimelineSynthesisOut(
        events=[
            SynthesizedEventItem(
                occurred_at=case.created_at.isoformat(),
                event_type="complaint_filed",
                title="Case Opened & Complaint Filed",
                description="Case was registered in Crime OS AI. Complaint ingestion started (approximate).",
                location=None,
            )
        ]
    )

    try:
        result: TimelineSynthesisOut = gemini_client.generate_json(
            db,
            purpose="timeline_synthesis",
            prompt=prompt,
            schema=TimelineSynthesisOut,
        )
        return result.events
    except GenerationError:
        logger.warning("Timeline synthesis Gemini call failed; using fallback for case=%s", case_id)
        return fallback.events


def _run_cctv_analysis(
    db: Session, frame_bytes: bytes, mime_type: str
) -> CctvAnalysisOut:
    """Call Gemini Vision with CCTV frame; return deterministic fallback on failure."""

    fallback = CctvAnalysisOut(
        detected_timestamp="Not visible in frame",
        location_description="Indeterminate location",
        persons_detected=[],
        vehicles_detected=[],
        forensic_flags=["CCTV analysis unavailable — Gemini API unreachable. Frame stored for manual review."],
        confidence=0.0,
    )

    try:
        result: CctvAnalysisOut = gemini_client.generate_json(
            db,
            purpose="cctv_analysis",
            prompt=CCTV_ANALYSIS_PROMPT,
            schema=CctvAnalysisOut,
            files=[(frame_bytes, mime_type)],
        )
        return result
    except GenerationError:
        logger.warning("CCTV Gemini analysis failed; using fallback")
        return fallback


def _build_cctv_description(analysis: CctvAnalysisOut) -> str:
    """Build a human-readable description from CCTV analysis for the timeline."""
    parts: list[str] = []

    if analysis.detected_timestamp != "Not visible in frame":
        parts.append(f"Timestamp: {analysis.detected_timestamp}.")

    if analysis.persons_detected:
        parts.append(f"Persons: {'; '.join(analysis.persons_detected[:3])}.")

    if analysis.vehicles_detected:
        parts.append(f"Vehicles: {'; '.join(analysis.vehicles_detected[:2])}.")

    if analysis.forensic_flags:
        parts.append(f"Flags: {'; '.join(analysis.forensic_flags[:3])}.")

    if not parts:
        parts.append("CCTV frame analyzed. No distinctive features identified.")

    return " ".join(parts)


def _parse_iso(dt_str: str) -> datetime | None:
    """Safely parse an ISO 8601 string; return None on failure."""
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _parse_osd_timestamp(raw: str) -> datetime | None:
    """Try common OSD timestamp formats; return None if unparseable."""
    if not raw or raw == "Not visible in frame":
        return None
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%d %b %Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None
