import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.audit import AuditEventOut
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get(
    "/cases/{case_id}",
    response_model=list[AuditEventOut],
    summary="Get audit event timeline for a case",
)
async def get_case_audit(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditEventOut]:
    events = audit_service.get_events(db, case_id)
    return [AuditEventOut.model_validate(e) for e in events]
