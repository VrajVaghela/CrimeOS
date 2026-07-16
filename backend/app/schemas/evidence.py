import uuid
from datetime import datetime
from pydantic import BaseModel


class EvidenceOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    file_path: str
    ai_tags: dict
    uploaded_at: datetime

    model_config = {"from_attributes": True}
