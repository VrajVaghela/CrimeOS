from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditEvent, Case, LegalRequest, RequestStatus
from app.schemas.cases import DashboardOut


def get_dashboard(db: Session) -> DashboardOut:
    cases = list(db.scalars(select(Case).order_by(Case.created_at.desc()).limit(8)))
    total_cases = db.scalar(select(func.count()).select_from(Case)) or 0
    pending_requests = db.scalar(
        select(func.count()).select_from(LegalRequest).where(LegalRequest.status == RequestStatus.DRAFT)
    ) or 0
    audit_events = db.scalar(select(func.count()).select_from(AuditEvent)) or 0
    return DashboardOut(
        active_cases=cases,
        total_cases=total_cases,
        pending_requests=pending_requests,
        audit_events=audit_events,
    )
