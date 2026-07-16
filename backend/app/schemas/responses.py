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
