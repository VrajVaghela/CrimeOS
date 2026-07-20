import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.command_center import CommandCenterOut
from app.services import command_center_service

router = APIRouter(prefix="/command_center", tags=["command_center"])


@router.get("/{case_id}", response_model=CommandCenterOut, summary="Get command center details for a case")
async def get_command_center_details(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommandCenterOut:
    try:
        return command_center_service.get_command_center(db, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
