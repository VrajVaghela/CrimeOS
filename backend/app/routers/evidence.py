import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Case, EvidenceFile
from app.schemas.evidence import EvidenceOut
from app.services import audit_service
from app.ai import gemini_client

router = APIRouter(prefix="/evidence", tags=["evidence"])


class GeminiTagsResponse(BaseModel):
    description: str
    tags: list[str]
    confidence: float
    flagged_features: list[str]


@router.post("/cases/{case_id}", response_model=EvidenceOut, summary="Upload case evidence and auto-tag via Gemini")
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

    # 2. Check if file is image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image evidence is supported for auto-tagging.")

    content = await file.read()

    # 3. Save file locally
    evidence_dir = os.path.join(settings.UPLOAD_DIR, "evidence", str(case_id))
    os.makedirs(evidence_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(evidence_dir, filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # Convert path to relative URL/relative path
    relative_path = os.path.join("uploads", "evidence", str(case_id), filename).replace("\\", "/")

    # 4. Invoke Gemini for Auto-Tagging
    from app.ai.prompts import EVIDENCE_TAGGING_PROMPT

    # Fallback response
    fallback_tags = GeminiTagsResponse(
        description="Uploaded evidence image.",
        tags=["evidence", "image", "upload"],
        confidence=0.8,
        flagged_features=["No specific forensic features flagged."]
    )

    try:
        # Pass bytes to gemini_client
        tags_data: GeminiTagsResponse = gemini_client.generate_json(
            db,
            purpose="evidence_tagging",
            prompt=EVIDENCE_TAGGING_PROMPT,
            schema=GeminiTagsResponse,
            files=[(content, file.content_type)],
            model=settings.GEMINI_FLASH_MODEL
        )
    except Exception as e:
        logger = gemini_client.logger
        logger.error(f"Failed to auto-tag evidence image via Gemini: {e}. Using fallback.")
        tags_data = fallback_tags

    # 5. Save to database
    evidence_record = EvidenceFile(
        case_id=case_id,
        file_path=relative_path,
        ai_tags=tags_data.model_dump()
    )
    db.add(evidence_record)
    db.flush()

    # Record Audit Event
    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="evidence_uploaded",
        detail={
            "evidence_id": str(evidence_record.id),
            "filename": file.filename,
            "tags": tags_data.tags,
            "description": tags_data.description
        }
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
