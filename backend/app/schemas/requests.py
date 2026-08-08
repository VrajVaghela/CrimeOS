import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import ProviderType, RequestStatus

class LegalRequestCreateIn(BaseModel):
    case_id: uuid.UUID
    path_step_id: uuid.UUID | None = None
    provider_name: str
    recipient_email: str

class LegalRequestUpdateIn(BaseModel):
    generated_body: str = Field(..., min_length=10, description="Draft body must be at least 10 characters long")
    provider_name: str = Field(..., min_length=2, description="Provider name must be at least 2 characters long")
    recipient_email: str = Field(..., min_length=3, description="Recipient email must be at least 3 characters long")

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
    # Phase 14C: stable dictionary-key suffixes so the frontend can render the
    # checklist in the officer's selected language. `label`/`message`/`fix` stay
    # English — they remain the authoritative audit-log text.
    message_key: str | None = None
    fix_key: str | None = None
    # Interpolation values for message_key (e.g. {"email": "nodal@provider.com"}).
    message_params: dict[str, str] | None = None


class RequestReadinessOut(BaseModel):
    is_ready: bool
    items: list[ReadinessItem]

