import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.summaries import CaseSummaryOut
from app.services import summary_service

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.get(
    "/cases/{case_id}",
    response_model=list[CaseSummaryOut],
    summary="List all versioned summaries for a case",
)
async def list_summaries(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CaseSummaryOut]:
    summaries = summary_service.get_summaries(db, case_id)
    return [CaseSummaryOut.model_validate(s) for s in summaries]


@router.post(
    "/cases/{case_id}/generate",
    response_model=CaseSummaryOut,
    summary="Generate a new versioned case summary via Gemini",
)
async def generate_summary(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseSummaryOut:
    summary = summary_service.generate_summary(db, case_id, current_user.id)
    return CaseSummaryOut.model_validate(summary)
