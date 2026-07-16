import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class CaseOut(BaseModel):
    id: uuid.UUID
    case_number: str
    title: str
    status: str
    crime_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CaseCreateIn(BaseModel):
    title: str
    description: str | None = None


from app.schemas.ingestion import ComplaintOut


class CaseDetailOut(CaseOut):
    complaints: list[ComplaintOut] = []

    model_config = {"from_attributes": True}


class DashboardOut(BaseModel):
    active_cases: list[CaseOut]
    total_cases: int
    pending_requests: int
    audit_events: int
