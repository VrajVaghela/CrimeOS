import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import ProviderType, RequestStatus

class LegalRequestCreateIn(BaseModel):
    case_id: uuid.UUID
    path_step_id: uuid.UUID | None = None
    provider_name: str
    recipient_email: str

class LegalRequestUpdateIn(BaseModel):
    generated_body: str
    provider_name: str
    recipient_email: str

class LegalRequestOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    path_step_id: uuid.UUID | None
    provider_type: ProviderType
    provider_name: str
    template_used: str
    generated_body: str
    recipient_email: str
    status: RequestStatus
    dispatched_at: datetime | None

    model_config = {"from_attributes": True}


class ReadinessItem(BaseModel):
    key: str
    label: str
    status: str  # "passed", "failed", "warning"
    message: str
    fix: str | None = None


class RequestReadinessOut(BaseModel):
    is_ready: bool
    items: list[ReadinessItem]

