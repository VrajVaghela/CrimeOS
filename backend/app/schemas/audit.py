import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditEventOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    detail: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}
