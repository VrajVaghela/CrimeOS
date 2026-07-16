import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditEvent


def record(
    db: Session,
    *,
    case_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    detail: dict[str, Any],
) -> AuditEvent:
    event = AuditEvent(case_id=case_id, user_id=user_id, action=action, detail=detail)
    db.add(event)
    return event


def get_events(db: Session, case_id: uuid.UUID) -> list[AuditEvent]:
    """Return all audit events for a case, oldest first."""
    return list(
        db.scalars(
            select(AuditEvent)
            .where(AuditEvent.case_id == case_id)
            .order_by(AuditEvent.created_at.asc())
        )
    )
