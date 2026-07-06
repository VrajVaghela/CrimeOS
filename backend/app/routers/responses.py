import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.responses import ProviderResponseOut
from app.services import analytics_service

router = APIRouter(prefix="/responses", tags=["provider responses"])


@router.get(
    "/cases/{case_id}",
    response_model=list[ProviderResponseOut],
    summary="Get provider responses for a case",
)
async def get_case_responses(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProviderResponseOut]:
    responses = analytics_service.get_responses_by_case(db, case_id)
    return [ProviderResponseOut.model_validate(r) for r in responses]


@router.get(
    "/requests/{request_id}",
    response_model=ProviderResponseOut,
    summary="Get provider response for a specific request",
)
async def get_request_response(
    request_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProviderResponseOut:
    response = analytics_service.get_response_by_request(db, request_id)
    return ProviderResponseOut.model_validate(response)


@router.post(
    "/{response_id}/insights",
    response_model=ProviderResponseOut,
    summary="Regenerate AI insights for a provider response",
)
async def regenerate_insights(
    response_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProviderResponseOut:
    response = analytics_service.regenerate_insights(db, response_id)
    return ProviderResponseOut.model_validate(response)
