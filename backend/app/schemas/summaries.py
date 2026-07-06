import uuid
from datetime import datetime

from pydantic import BaseModel


class CaseSummaryOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    version: int
    content: str
    generated_at: datetime

    model_config = {"from_attributes": True}
