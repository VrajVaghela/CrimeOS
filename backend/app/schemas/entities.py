import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class CaseEntityOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    entity_type: str
    canonical_value: str
    display_value: str
    confidence: float
    first_seen_at: datetime
    last_seen_at: datetime

    model_config = {"from_attributes": True}


class EntityRelationshipOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    source_entity_id: uuid.UUID
    target_entity_id: uuid.UUID
    relationship_type: str
    confidence: float
    evidence_ref: dict[str, Any]

    model_config = {"from_attributes": True}


class RelatedCaseMatch(BaseModel):
    entity_type: str
    value: str
    confidence: float


class RelatedCaseOut(BaseModel):
    case_id: str
    case_number: str
    title: str
    status: str
    matches: list[RelatedCaseMatch]
