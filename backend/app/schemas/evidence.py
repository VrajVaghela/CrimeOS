import uuid
from datetime import datetime
from pydantic import BaseModel


class EvidenceMarkerOut(BaseModel):
    id: uuid.UUID
    evidence_file_id: uuid.UUID
    marker_type: str
    start_ms: int | None = None
    end_ms: int | None = None
    transcript_text: str | None = None
    linked_entity_ids: list[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class EvidenceMarkerCreate(BaseModel):
    marker_type: str
    start_ms: int | None = None
    end_ms: int | None = None
    transcript_text: str | None = None
    linked_entity_ids: list[str] = []


class EvidenceOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    file_path: str
    file_type: str | None = None
    transcript: str | None = None
    translation: str | None = None
    ai_tags: dict
    uploaded_at: datetime
    markers: list[EvidenceMarkerOut] = []

    model_config = {"from_attributes": True}

