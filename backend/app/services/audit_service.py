import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditEvent


def record(db: Session, *, case_id: uuid.UUID, user_id: uuid.UUID | None, action: str, detail: dict[str, Any]) -> AuditEvent:
    event = AuditEvent(case_id=case_id, user_id=user_id, action=action, detail=detail)
    db.add(event)
    return event
