import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ExtractedEntityOut(BaseModel):
    id: uuid.UUID
    entity_type: str
    value: str
    confidence: float

    model_config = {"from_attributes": True}


class ComplaintOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    source_type: str
    original_file_path: str | None
    detected_language: str | None
    raw_text: str | None
    translated_text: str | None
    created_at: datetime
    entities: list[ExtractedEntityOut]

    model_config = {"from_attributes": True}


class EntityUpdate(BaseModel):
    value: str


class IngestionStatusOut(BaseModel):
    complaint_id: uuid.UUID
    status: Literal["processing", "done", "failed"]
    message: str
