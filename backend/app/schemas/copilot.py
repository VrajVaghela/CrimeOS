import uuid
from datetime import datetime
from pydantic import BaseModel


class CopilotAskIn(BaseModel):
    question: str


class AiCitationOut(BaseModel):
    id: uuid.UUID
    output_type: str
    output_id: uuid.UUID
    source_type: str
    source_id: str
    excerpt: str | None = None
    locator: str | None = None
    confidence: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CopilotMessageOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    user_id: uuid.UUID | None = None
    role: str
    message: str
    cited_source_ids: list[str] = []
    citations: list[AiCitationOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}
