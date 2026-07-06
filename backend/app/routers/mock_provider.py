import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.responses import ProviderResponseOut
from app.services import analytics_service

router = APIRouter(prefix="/mock/provider", tags=["mock provider"])


@router.post("/respond/{request_id}", response_model=ProviderResponseOut, summary="Trigger a mock response from a provider")
async def trigger_mock_response(
    request_id: uuid.UUID,
    db: Session = Depends(get_db)
) -> ProviderResponseOut:
    response = analytics_service.generate_mock_response(db, request_id)
    return ProviderResponseOut.model_validate(response)
