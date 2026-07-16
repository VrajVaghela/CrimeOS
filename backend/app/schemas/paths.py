import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import StepStatus, LegalCode

class LegalSectionOut(BaseModel):
    id: uuid.UUID
    code: LegalCode
    section_number: str
    title: str
    text: str

    model_config = {"from_attributes": True}

class CaseSectionOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    legal_section_id: uuid.UUID
    ai_reasoning: str
    confidence: float
    status: str
    legal_section: LegalSectionOut

    model_config = {"from_attributes": True}


class PathStepOut(BaseModel):
    id: uuid.UUID
    path_id: uuid.UUID
    step_order: int
    title: str
    description: str
    sop_citation: str
    status: StepStatus
    suggested_action_type: str | None

    model_config = {"from_attributes": True}

class InvestigationPathOut(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    generated_at: datetime
    model_used: str
    steps: list[PathStepOut] = []

    model_config = {"from_attributes": True}

class PathStepUpdate(BaseModel):
    status: StepStatus

class PathGenerationStatusOut(BaseModel):
    case_id: uuid.UUID
    status: str  # "processing", "done", "failed", "not_started"
    message: str
    path: InvestigationPathOut | None = None
    case_sections: list[CaseSectionOut] = []
