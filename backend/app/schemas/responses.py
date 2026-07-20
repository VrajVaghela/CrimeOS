import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel

class ProviderResponseOut(BaseModel):
    id: uuid.UUID
    legal_request_id: uuid.UUID
    received_at: datetime
    file_path: str | None
    parsed_data: dict[str, Any]
    ai_insights: str

    model_config = {"from_attributes": True}


class ResponseCorrelationOut(BaseModel):
    id: str
    response_id: uuid.UUID
    row_index: int
    source_row: dict[str, Any]
    matched_entity_id: uuid.UUID | None
    matched_entity_value: str | None
    reason: str
    confidence: float
    linked_path_step_id: uuid.UUID | None
    linked_path_step_title: str
    is_promoted: bool

    model_config = {"from_attributes": True}

