import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import User, UserRole
from app.schemas.paths import (
    PathGenerationStatusOut,
    PathStepOut,
    PathStepUpdate,
    CaseSectionOut,
    InvestigationPathOut,
    PathRevisionTriggerIn,
)
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


@router.patch("/sections/{section_id}/status", response_model=CaseSectionOut, summary="Update case section review status")
async def update_section_status(
    section_id: uuid.UUID,
    status: str = Query(..., description="New review status (approved / rejected / pending)"),
    current_user: User = Depends(require_role(UserRole.LEGAL)),
    db: Session = Depends(get_db),
 ) -> CaseSectionOut:
    try:
        updated = path_service.update_section_status(db, section_id, status, current_user.id)
        return CaseSectionOut.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/cases/{case_id}/revisions", response_model=list[InvestigationPathOut], summary="List all path revisions for a case")
async def list_path_revisions(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InvestigationPathOut]:
    from app.models import InvestigationPath
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    revisions = list(
        db.scalars(
            select(InvestigationPath)
            .options(selectinload(InvestigationPath.steps))
            .where(InvestigationPath.case_id == case_id)
            .order_by(InvestigationPath.revision_number.desc())
        )
    )
    return [InvestigationPathOut.model_validate(r) for r in revisions]


@router.post("/cases/{case_id}/revision", response_model=InvestigationPathOut, summary="Trigger a new manual investigation path revision")
async def trigger_path_revision(
    case_id: uuid.UUID,
    body: PathRevisionTriggerIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestigationPathOut:
    try:
        from app.services import path_revision_service
        new_path = path_revision_service.generate_path_revision(
            db=db,
            case_id=case_id,
            user_id=current_user.id,
            trigger_type=body.trigger_type,
            change_reason=body.change_reason
        )
        return InvestigationPathOut.model_validate(new_path)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

