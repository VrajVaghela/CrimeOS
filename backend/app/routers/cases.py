"""
Cases router — Phase 2 + Phase 5 search.

GET    /cases/dashboard        — dashboard stats (Phase 1, unchanged)
GET    /cases                  — list all cases, newest first
GET    /cases/search?q=...     — search cases by title / case_number (Phase 5)
POST   /cases                  — create a new case
GET    /cases/{case_id}        — get case detail with complaints + entities
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Case, Complaint, User
from app.schemas.cases import CaseCreateIn, CaseDetailOut, CaseOut, DashboardOut
from app.services import audit_service, case_service

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/dashboard", response_model=DashboardOut, summary="Dashboard summary stats")
async def dashboard(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardOut:
    return case_service.get_dashboard(db)


@router.get("", response_model=list[CaseOut], summary="List all cases (newest first)")
async def list_cases(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CaseOut]:
    cases = list(db.scalars(select(Case).order_by(Case.created_at.desc())))
    return [CaseOut.model_validate(c) for c in cases]


@router.get("/search", response_model=list[CaseOut], summary="Search cases by title or case number")
async def search_cases(
    q: str = Query(default="", description="Search query (title or case number)"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CaseOut]:
    term = f"%{q.strip()}%"
    cases = list(
        db.scalars(
            select(Case)
            .where(or_(Case.title.ilike(term), Case.case_number.ilike(term)))
            .order_by(Case.created_at.desc())
            .limit(20)
        )
    )
    return [CaseOut.model_validate(c) for c in cases]


@router.post("", response_model=CaseOut, status_code=201, summary="Create a new case")
async def create_case(
    body: CaseCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseOut:
    count: int = db.scalar(select(func.count()).select_from(Case)) or 0
    case_number = f"CASE-{datetime.now().year}{count + 1:04d}"

    case = Case(
        case_number=case_number,
        title=body.title,
        status="open",
        created_by=current_user.id,
    )
    db.add(case)
    db.flush()
    audit_service.record(
        db,
        case_id=case.id,
        user_id=current_user.id,
        action="case_created",
        detail={"title": body.title, "case_number": case_number},
    )
    db.commit()
    db.refresh(case)
    return CaseOut.model_validate(case)


@router.get("/{case_id}", response_model=CaseDetailOut, summary="Get case with complaints and entities")
async def get_case(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseDetailOut:
    case = db.scalar(
        select(Case)
        .options(selectinload(Case.complaints).selectinload(Complaint.entities))
        .where(Case.id == case_id)
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseDetailOut.model_validate(case)
