"""Timeline Agent router — thin HTTP layer only.

Rules:
- No business logic or Gemini calls here.
- Validates input, calls timeline_service, returns schema.
- Uploads CCTV frames as multipart (same pattern as evidence.py).
"""
from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Case, EvidenceFile, User
from app.schemas.timeline import CctvPinOut, OfficerNoteIn, TimelineEventOut
from app.services import timeline_service

router = APIRouter(prefix="/timeline", tags=["timeline"])

_SUPPORTED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.get(
    "/cases/{case_id}",
    response_model=list[TimelineEventOut],
    summary="Get (or synthesize) the chronological case timeline",
)
async def get_case_timeline(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TimelineEventOut]:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    events = timeline_service.get_or_synthesize_timeline(db, case_id, current_user.id)
    return [TimelineEventOut.model_validate(e) for e in events]


@router.post(
    "/cases/{case_id}/cctv",
    response_model=CctvPinOut,
    summary="Upload a CCTV frame, analyze via Gemini Vision, and pin to timeline",
)
async def upload_cctv_frame(
    case_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CctvPinOut:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not file.content_type or file.content_type not in _SUPPORTED_IMAGE_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG, PNG, or WebP image.",
        )

    frame_bytes = await file.read()
    if len(frame_bytes) > 20 * 1024 * 1024:  # 20 MB guard
        raise HTTPException(status_code=413, detail="CCTV frame exceeds 20 MB limit.")

    # Persist frame as an evidence file so the gallery link works
    evidence_dir = os.path.join(settings.UPLOAD_DIR, "cctv", str(case_id))
    os.makedirs(evidence_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4()}_{(file.filename or 'frame.jpg').replace(' ', '_')}"
    disk_path = os.path.join(evidence_dir, safe_name)
    with open(disk_path, "wb") as fh:
        fh.write(frame_bytes)
    relative_path = os.path.join("uploads", "cctv", str(case_id), safe_name).replace("\\", "/")

    evidence_record = EvidenceFile(
        case_id=case_id,
        file_path=relative_path,
        ai_tags={},  # CCTV analysis stored in timeline_events.cctv_analysis
    )
    db.add(evidence_record)
    db.flush()

    event, analysis = timeline_service.analyze_cctv_and_pin(
        db,
        case_id=case_id,
        evidence_file_id=evidence_record.id,
        frame_bytes=frame_bytes,
        mime_type=file.content_type,
        user_id=current_user.id,
    )

    return CctvPinOut(
        event=TimelineEventOut.model_validate(event),
        analysis=analysis,
    )


@router.post(
    "/cases/{case_id}/notes",
    response_model=TimelineEventOut,
    summary="Add an officer note to the case timeline",
)
async def add_officer_note(
    case_id: uuid.UUID,
    body: OfficerNoteIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TimelineEventOut:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    event = timeline_service.add_officer_note(db, case_id, body, current_user.id)
    return TimelineEventOut.model_validate(event)
