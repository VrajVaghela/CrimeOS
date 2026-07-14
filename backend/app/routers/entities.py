import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, CaseEntity, EntityRelationship
from app.schemas.entities import CaseEntityOut, EntityRelationshipOut, RelatedCaseOut
from app.services import entity_service

router = APIRouter(prefix="/entities", tags=["case entity intelligence"])


@router.get("/cases/{case_id}", response_model=list[CaseEntityOut], summary="Get normalized case entities")
async def get_case_entities(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CaseEntityOut]:
    entities = db.scalars(
        select(CaseEntity).where(CaseEntity.case_id == case_id)
    ).all()
    return [CaseEntityOut.model_validate(e) for e in entities]


@router.get("/cases/{case_id}/relationships", response_model=list[EntityRelationshipOut], summary="Get case entity relationships")
async def get_entity_relationships(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EntityRelationshipOut]:
    relationships = db.scalars(
        select(EntityRelationship).where(EntityRelationship.case_id == case_id)
    ).all()
    return [EntityRelationshipOut.model_validate(r) for r in relationships]


@router.get("/cases/{case_id}/related-cases", response_model=list[RelatedCaseOut], summary="Find related cases based on entities")
async def get_related_cases(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RelatedCaseOut]:
    related = entity_service.find_related_cases(db, case_id)
    return [RelatedCaseOut(**r) for r in related]


@router.post("/cases/{case_id}/sync", response_model=list[CaseEntityOut], summary="Manually sync case entities")
async def sync_entities(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CaseEntityOut]:
    try:
        entities = entity_service.sync_case_entities(db, case_id)
        db.commit()
        return [CaseEntityOut.model_validate(e) for e in entities]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
