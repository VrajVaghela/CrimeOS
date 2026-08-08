import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CopilotIntent = Literal[
    "next_action",
    "missing_facts",
    "evidence",
    "legal_basis",
    "provider_response",
]


class CopilotAskIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    # Canonical intent sent by the quick-question chips. Keeps prompt routing
    # language-independent — a Gujarati chip label must still reach the right prompt.
    intent: CopilotIntent | None = None
    # Optional explicit override. Normally the language comes from the X-Lang header
    # (see get_lang), so callers do not need to set this.
    lang: Literal["en", "hi", "gu"] | None = None


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
    # Display text: localized when available, otherwise the authoritative English.
    message: str
    # Authoritative English text — always present, used for audit/export surfaces.
    message_en: str
    # Language `message` is rendered in.
    lang: str = "en"
    cited_source_ids: list[str] = []
    citations: list[AiCitationOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}
