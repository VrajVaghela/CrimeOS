import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.responses import ProviderResponseOut, ResponseCorrelationOut
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


@router.get(
    "/{response_id}/correlations",
    response_model=list[ResponseCorrelationOut],
    summary="Get explainable response correlations for a response",
)
async def get_response_correlations(
    response_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ResponseCorrelationOut]:
    correlations = analytics_service.get_response_correlations(db, response_id)
    return [ResponseCorrelationOut.model_validate(c) for c in correlations]


@router.post(
    "/{response_id}/promote/{row_index}",
    summary="Promote a response correlation row to case diary/summary",
)
async def promote_response_row(
    response_id: uuid.UUID,
    row_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = analytics_service.promote_correlation_to_diary(db, response_id, row_index, current_user)
    return res

