import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.paths import PathGenerationStatusOut, PathStepOut, PathStepUpdate
from app.services import path_service

router = APIRouter(prefix="/paths", tags=["investigation paths"])


@router.get("/cases/{case_id}", response_model=PathGenerationStatusOut, summary="Get investigation path and status")
async def get_case_path(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathGenerationStatusOut:
    status_data = path_service.get_path_status(db, case_id)
    return PathGenerationStatusOut(
        case_id=case_id,
        status=status_data["status"],
        message=status_data["message"],
        path=status_data["path"],
        case_sections=status_data["case_sections"]
    )


@router.post("/cases/{case_id}/generate", response_model=PathGenerationStatusOut, summary="Trigger investigation path generation")
async def generate_case_path(
    case_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathGenerationStatusOut:
    status_data = path_service.trigger_path_generation(db, case_id, current_user.id, background_tasks)
    return PathGenerationStatusOut(
        case_id=case_id,
        status=status_data["status"],
        message=status_data["message"]
    )


@router.patch("/steps/{step_id}", response_model=PathStepOut, summary="Update step status")
async def update_step(
    step_id: uuid.UUID,
    body: PathStepUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PathStepOut:
    try:
        updated_step = path_service.update_step_status(db, step_id, body.status, current_user.id)
        return PathStepOut.model_validate(updated_step)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
