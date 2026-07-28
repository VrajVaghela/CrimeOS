import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai import gemini_client
from app.ai.prompts import CASE_SUMMARY_PROMPT
from app.exceptions import NotFoundError, GenerationError
from app.models import (
    AuditEvent,
    Case,
    CaseSection,
    CaseSummary,
    Complaint,
    ExtractedEntity,
    InvestigationPath,
    LegalRequest,
    LegalSection,
    PathStep,
    ProviderResponse,
    User,
)
from app.services import audit_service

logger = logging.getLogger("crime_os.summary")


def get_summaries(db: Session, case_id: uuid.UUID) -> list[CaseSummary]:
    """Return all summaries for a case, newest version first."""
    return list(
        db.scalars(
            select(CaseSummary)
            .where(CaseSummary.case_id == case_id)
            .order_by(CaseSummary.version.desc())
        )
    )


def _assemble_case_context(db: Session, case_id: uuid.UUID) -> dict[str, Any]:
    """Gather all case data needed to build a summary prompt."""
    case = db.get(Case, case_id)
    if not case:
        raise NotFoundError("Case not found")

    # Complaints + entities
    complaints = list(
        db.scalars(select(Complaint).where(Complaint.case_id == case_id))
    )
    complaint_ids = [c.id for c in complaints]

    entities: list[ExtractedEntity] = []
    if complaint_ids:
        entities = list(
            db.scalars(
                select(ExtractedEntity).where(ExtractedEntity.complaint_id.in_(complaint_ids))
            )
        )

    complaint_texts = []
    for c in complaints:
        if c.translated_text:
            complaint_texts.append(c.translated_text[:500])
        elif c.raw_text:
            complaint_texts.append(c.raw_text[:500])
    complaint_summary = "\n---\n".join(complaint_texts) or "No complaint text available."

    entity_lines = [f"- {e.entity_type}: {e.value} (confidence: {e.confidence:.0%})" for e in entities]
    extracted_entities_text = "\n".join(entity_lines) or "No entities extracted."

    # Investigation path + steps
    path = db.scalar(
        select(InvestigationPath)
        .where(InvestigationPath.case_id == case_id)
        .order_by(InvestigationPath.generated_at.desc())
    )
    path_lines: list[str] = []
    if path:
        steps = list(
            db.scalars(
                select(PathStep)
                .where(PathStep.path_id == path.id)
                .order_by(PathStep.step_order)
            )
        )
        for step in steps:
            path_lines.append(
                f"Step {step.step_order}: [{step.status.upper()}] {step.title} — {step.description[:200]}"
            )
    investigation_path_text = "\n".join(path_lines) or "No investigation path generated yet."

    # Legal sections
    case_sections = list(
        db.scalars(select(CaseSection).where(CaseSection.case_id == case_id))
    )
    legal_lines: list[str] = []
    for cs in case_sections:
        ls = db.get(LegalSection, cs.legal_section_id)
        if ls:
            legal_lines.append(
                f"- {ls.code} Section {ls.section_number} ({ls.title}): {cs.ai_reasoning[:200]}"
            )
    legal_sections_text = "\n".join(legal_lines) or "No legal sections applied."

    # Legal requests
    legal_requests = list(
        db.scalars(select(LegalRequest).where(LegalRequest.case_id == case_id))
    )
    request_lines = []
    request_ids = []
    for lr in legal_requests:
        request_lines.append(
            f"- {lr.provider_type.value.upper()} request to {lr.provider_name} — status: {lr.status.value}"
        )
        request_ids.append(lr.id)
    legal_requests_text = "\n".join(request_lines) or "No legal requests created."

    # Provider insights
    insight_lines: list[str] = []
    if request_ids:
        provider_responses = list(
            db.scalars(
                select(ProviderResponse).where(ProviderResponse.legal_request_id.in_(request_ids))
            )
        )
        for pr in provider_responses:
            if pr.ai_insights:
                insight_lines.append(pr.ai_insights[:400])

    # Promoted evidence from responses
    from app.models.copilot import AiCitation
    promoted = list(db.scalars(
        select(AiCitation).where(
            AiCitation.case_id == case_id,
            AiCitation.source_type == "provider_response_row"
        )
    ))
    if promoted:
        insight_lines.append("Promoted Provider Response Records (Case Diary):")
        for p in promoted:
            insight_lines.append(f"- [{p.locator}] (Confidence {p.confidence:.0%}): {p.excerpt}")

    provider_insights_text = "\n---\n".join(insight_lines) or "No provider responses received."


    # Last 10 audit events
    audit_events = list(
        db.scalars(
            select(AuditEvent)
            .where(AuditEvent.case_id == case_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(10)
        )
    )
    audit_lines = [
        f"- [{e.created_at.strftime('%Y-%m-%d %H:%M')}] {e.action}: {str(e.detail)[:150]}"
        for e in reversed(audit_events)
    ]
    audit_text = "\n".join(audit_lines) or "No audit events recorded."

    return {
        "case": case,
        "complaint_summary": complaint_summary,
        "extracted_entities": extracted_entities_text,
        "investigation_path": investigation_path_text,
        "legal_sections": legal_sections_text,
        "legal_requests": legal_requests_text,
        "provider_insights": provider_insights_text,
        "recent_audit_events": audit_text,
    }


def generate_summary(db: Session, case_id: uuid.UUID, user_id: uuid.UUID | None) -> CaseSummary:
    """Generate a new versioned case summary using Gemini."""
    context = _assemble_case_context(db, case_id)
    case: Case = context["case"]

    prompt = CASE_SUMMARY_PROMPT.format(
        case_number=case.case_number,
        case_title=case.title,
        crime_type=case.crime_type or "Unknown",
        status=case.status,
        created_at=case.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        complaint_summary=context["complaint_summary"],
        extracted_entities=context["extracted_entities"],
        investigation_path=context["investigation_path"],
        legal_sections=context["legal_sections"],
        legal_requests=context["legal_requests"],
        provider_insights=context["provider_insights"],
        recent_audit_events=context["recent_audit_events"],
    )

    # Determine next version number
    max_version = db.scalar(
        select(func.max(CaseSummary.version)).where(CaseSummary.case_id == case_id)
    )
    next_version = (max_version or 0) + 1

    # Generate summary text
    try:
        summary_text = gemini_client.generate_text(
            db,
            purpose=f"case_summary_{case_id}_v{next_version}",
            prompt=prompt,
        )
    except GenerationError as exc:
        logger.error("summary_generation_failed case_id=%s error=%s", case_id, exc)
        summary_text = (
            f"[AUTO-GENERATED FALLBACK SUMMARY — Version {next_version}]\n\n"
            f"Case: {case.case_number} — {case.title}\n"
            f"Crime Type: {case.crime_type or 'Under classification'}\n"
            f"Status: {case.status}\n\n"
            "Full AI summary generation encountered an error. "
            "Please regenerate once the Gemini service is available.\n\n"
            f"Investigation context assembled at {case.created_at.strftime('%Y-%m-%d')}."
        )

    new_summary = CaseSummary(
        case_id=case_id,
        version=next_version,
        content=summary_text,
    )
    db.add(new_summary)
    db.flush()

    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="summary_generated",
        detail={"version": next_version, "summary_id": str(new_summary.id)},
    )

    db.commit()
    db.refresh(new_summary)
    logger.info("summary_generated case_id=%s version=%s", case_id, next_version)
    return new_summary
