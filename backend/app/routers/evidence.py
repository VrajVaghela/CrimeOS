import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Case, EvidenceFile
from app.schemas.evidence import EvidenceOut, EvidenceMarkerOut, EvidenceMarkerCreate
from app.services import evidence_service

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("/cases/{case_id}", response_model=EvidenceOut, summary="Upload case evidence (image, audio, video, doc) and analyze via Gemini")
async def upload_evidence(
    case_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EvidenceOut:
    # 1. Validate case
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # 2. Delegate creation & analysis to service — AppError propagates to global handler
    evidence_record = evidence_service.create_evidence_stream(
        db=db,
        case_id=case_id,
        file_name=file.filename or "evidence",
        content_type=file.content_type or "application/octet-stream",
        file_obj=file.file,
        current_user_id=current_user.id,
    )
    db.commit()
    db.refresh(evidence_record)
    return EvidenceOut.model_validate(evidence_record)


@router.get("/cases/{case_id}", response_model=list[EvidenceOut], summary="List all evidence files for a case")
async def list_evidence(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EvidenceOut]:
    evidence = list(db.scalars(
        select(EvidenceFile).where(EvidenceFile.case_id == case_id).order_by(EvidenceFile.uploaded_at.desc())
    ))
    return [EvidenceOut.model_validate(e) for e in evidence]


@router.post("/{evidence_id}/markers", response_model=EvidenceMarkerOut, summary="Create a segment marker on an evidence file")
async def create_marker(
    evidence_id: uuid.UUID,
    payload: EvidenceMarkerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EvidenceMarkerOut:
    marker = evidence_service.create_marker(
        db=db,
        evidence_file_id=evidence_id,
        marker_type=payload.marker_type,
        start_ms=payload.start_ms,
        end_ms=payload.end_ms,
        transcript_text=payload.transcript_text,
        linked_entity_ids=payload.linked_entity_ids,
        current_user_id=current_user.id,
    )
    db.commit()
    db.refresh(marker)
    return EvidenceMarkerOut.model_validate(marker)


@router.post("/markers/{marker_id}/link", response_model=EvidenceMarkerOut, summary="Link a marker to a case entity")
async def link_marker_to_entity(
    marker_id: uuid.UUID,
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EvidenceMarkerOut:
    marker = evidence_service.link_marker_to_entity(
        db=db,
        marker_id=marker_id,
        entity_id=entity_id,
        current_user_id=current_user.id,
    )
    db.commit()
    db.refresh(marker)
    return EvidenceMarkerOut.model_validate(marker)


@router.post("/markers/{marker_id}/promote", response_model=EvidenceMarkerOut, summary="Promote an evidence marker fact to the case timeline")
async def promote_marker(
    marker_id: uuid.UUID,
    note: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EvidenceMarkerOut:
    marker = evidence_service.promote_marker_to_case(
        db=db,
        marker_id=marker_id,
        current_user_id=current_user.id,
        note=note,
    )
    db.commit()
    db.refresh(marker)
    return EvidenceMarkerOut.model_validate(marker)
