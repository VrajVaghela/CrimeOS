import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class WorkflowStageOut(BaseModel):
    stage: str
    label: str
    label_hi: str
    status: str  # 'pending', 'in_progress', 'done', 'skipped'
    is_completed: bool


class RecentActivityOut(BaseModel):
    id: uuid.UUID
    action: str
    timestamp: datetime
    actor_name: str | None = None
    detail: dict[str, Any] | None = None


class CaseWorkflowStateOut(BaseModel):
    case_id: uuid.UUID
    current_stage: str
    blocker_codes: list[str]
    next_action_type: str | None
    next_action_label: str | None
    updated_at: datetime
    stages: list[WorkflowStageOut]
    completion_percentage: int
    recent_activity: list[RecentActivityOut] = []

    model_config = {"from_attributes": True}


class CommandCenterOut(BaseModel):
    case_id: uuid.UUID
    case_number: str
    title: str
    status: str
    crime_type: str | None
    created_at: datetime
    workflow: CaseWorkflowStateOut

    model_config = {"from_attributes": True}
