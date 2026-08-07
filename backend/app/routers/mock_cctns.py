import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Case
from app.services import audit_service
from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/mock/cctns", tags=["mock cctns"])


class CctnsSyncIn(BaseModel):
    case_id: uuid.UUID


class CctnsSyncOut(BaseModel):
    case_id: uuid.UUID
    cctns_fir_number: str
    synchronized_at: str
    status: str
    message: str


@router.get("/status", response_model=RouteStubOut)
async def mock_cctns_status() -> RouteStubOut:
    return RouteStubOut(
        module="mock_cctns",
        status="active",
        message="Mock CCTNS sync router is fully operational.",
    )


@router.post("/sync", response_model=CctnsSyncOut, summary="Mock synchronize case with CCTNS / eGujcop")
async def sync_cctns(
    body: CctnsSyncIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CctnsSyncOut:
    case = db.get(Case, body.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Generate a mock CCTNS FIR Number with robust suffix extraction
    import re
    case_num = case.case_number or ""
    parts = case_num.split("-")
    last_part = parts[-1] if parts else ""
    num_suffix = "".join(filter(str.isdigit, last_part)) or re.sub(r"\D", "", str(case.id))[:6] or "000001"
    cctns_fir_number = f"FIR-{datetime.now().year}-{num_suffix.zfill(6)}"

    # Record Audit Event
    audit_service.record(
        db,
        case_id=case.id,
        user_id=current_user.id,
        action="cctns_synced",
        detail={
            "cctns_fir_number": cctns_fir_number,
            "synced_by": current_user.username,
            "officer_name": current_user.full_name,
        },
    )

    case.status = "synced"
    db.commit()
    db.refresh(case)

    return CctnsSyncOut(
        case_id=case.id,
        cctns_fir_number=cctns_fir_number,
        synchronized_at=datetime.utcnow().isoformat() + "Z",
        status="success",
        message="Case details synchronized with CCTNS. FIR Number assigned successfully.",
    )
