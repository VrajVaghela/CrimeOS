"""
Ingestion router — Phase 2.

POST   /ingestion/cases/{case_id}/complaints
    Upload a file (PDF / image / audio). Returns 202 immediately; AI processing runs
    in the background. Poll the GET endpoint every 2 s for results.

GET    /ingestion/cases/{case_id}/complaints/{complaint_id}
    Returns the complaint record with all extracted entities once processing is done.

PATCH  /ingestion/cases/{case_id}/complaints/{complaint_id}/entities/{entity_id}
    Officer corrects an extracted entity value.
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Complaint, ExtractedEntity, SourceType, User
from app.schemas.ingestion import ComplaintOut, EntityUpdate, ExtractedEntityOut, IngestionStatusOut
from app.services import audit_service, ingestion_service

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

# Maps content-type → SourceType enum value
ALLOWED_MIME: dict[str, SourceType] = {
    "application/pdf": SourceType.PDF,
    "image/jpeg": SourceType.IMAGE,
    "image/png": SourceType.IMAGE,
    "audio/mpeg": SourceType.AUDIO,
    "audio/mp3": SourceType.AUDIO,
    "audio/wav": SourceType.AUDIO,
    "audio/x-wav": SourceType.AUDIO,
    "audio/mp4": SourceType.AUDIO,
    "audio/webm": SourceType.AUDIO,
    "audio/m4a": SourceType.AUDIO,
    "text/plain": SourceType.TEXT,
}

# Extension fallback when the browser sends a generic content-type
EXT_MIME: dict[str, SourceType] = {
    ".pdf": SourceType.PDF,
    ".jpg": SourceType.IMAGE,
    ".jpeg": SourceType.IMAGE,
    ".png": SourceType.IMAGE,
    ".mp3": SourceType.AUDIO,
    ".wav": SourceType.AUDIO,
    ".m4a": SourceType.AUDIO,
    ".webm": SourceType.AUDIO,
    ".txt": SourceType.TEXT,
}


@router.post(
    "/cases/{case_id}/complaints",
    response_model=IngestionStatusOut,
    status_code=202,
    summary="Upload a complaint file and start AI processing",
)
async def upload_complaint(
    case_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IngestionStatusOut:
    # Resolve source type from content-type header, then by file extension
    source_type: SourceType | None = ALLOWED_MIME.get(file.content_type or "")
    if source_type is None:
        ext = Path(file.filename or "").suffix.lower()
        source_type = EXT_MIME.get(ext)
    if source_type is None:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Accepted: PDF, JPG/PNG image, MP3/WAV/M4A/WebM audio.",
        )

    saved_path, size_bytes = ingestion_service.save_upload_stream(
        case_id, file.filename or "upload", file.file
    )

    complaint = Complaint(
        case_id=case_id,
        source_type=source_type,
        original_file_path=str(saved_path),
    )
    db.add(complaint)
    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="complaint_uploaded",
        detail={
            "filename": file.filename,
            "source_type": source_type.value,
            "size_bytes": size_bytes,
        },
    )
    db.commit()
    db.refresh(complaint)

    # Queue background processing — ingestion_service opens its own session
    background_tasks.add_task(
        ingestion_service.process_complaint,
        complaint_id=complaint.id,
        user_id=current_user.id,
    )

    return IngestionStatusOut(
        complaint_id=complaint.id,
        status="processing",
        message="File uploaded. AI analysis in progress — poll the GET endpoint every 2 s for results.",
    )


@router.get(
    "/cases/{case_id}/complaints/{complaint_id}",
    response_model=ComplaintOut,
    summary="Get complaint and extracted entities (poll for processing status)",
)
async def get_complaint(
    case_id: uuid.UUID,
    complaint_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComplaintOut:
    complaint = db.get(Complaint, complaint_id)
    if not complaint or complaint.case_id != case_id:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintOut.model_validate(complaint)


@router.patch(
    "/cases/{case_id}/complaints/{complaint_id}/entities/{entity_id}",
    response_model=ExtractedEntityOut,
    summary="Correct an extracted entity value",
)
async def update_entity(
    case_id: uuid.UUID,
    complaint_id: uuid.UUID,
    entity_id: uuid.UUID,
    body: EntityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExtractedEntityOut:
    entity = db.get(ExtractedEntity, entity_id)
    if not entity or entity.complaint_id != complaint_id:
        raise HTTPException(status_code=404, detail="Entity not found")

    entity.value = body.value
    db.flush()

    from app.services import entity_service, path_revision_service
    entity_service.sync_case_entities(db, case_id=case_id)
    try:
        path_revision_service.generate_path_revision(
            db=db,
            case_id=case_id,
            user_id=current_user.id,
            trigger_type="entities_verified",
            change_reason=f"Investigating Officer verified or corrected case entity ({entity.entity_type}) to '{body.value}'."
        )
    except Exception as pr_exc:
        # Don't fail the correction if path revision fails, but log it
        import logging
        logging.getLogger("crime_os.ingestion").error("Path revision failed on entity update: %s", pr_exc, exc_info=True)

    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="entity_updated",
        detail={
            "entity_id": str(entity_id),
            "entity_type": entity.entity_type,
            "new_value": body.value,
        },
    )
    db.commit()
    db.refresh(entity)
    return ExtractedEntityOut.model_validate(entity)
