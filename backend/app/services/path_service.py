import logging
import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field
from fastapi import BackgroundTasks
from sqlalchemy import select, delete
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import SessionLocal
from app.models import (
    Case,
    Complaint,
    ExtractedEntity,
    InvestigationPath,
    PathStep,
    CaseSection,
    LegalSection
)
from app.models.enums import StepStatus, LegalCode
from app.ai import gemini_client
from app.ai.prompts import INVESTIGATION_PATH_PROMPT
from app.services import audit_service, rag_service

logger = logging.getLogger("crime_os.paths")

# Global in-memory job tracker for path generation
# case_id -> {"status": "processing" | "done" | "failed", "error": str | None}
PATH_JOBS: dict[uuid.UUID, dict] = {}

class GeminiPathStep(BaseModel):
    step_order: int
    title: str
    description: str
    sop_citation: str
    suggested_action_type: str | None = None  # e.g., telecom, bank, platform, or null

class GeminiCaseSection(BaseModel):
    code: str  # BNS, BNSS, BSA
    section_number: str
    ai_reasoning: str
    confidence: float

class GeminiPathResponse(BaseModel):
    crime_type: str  # cyber_fraud, theft, harassment, banking_fraud
    steps: list[GeminiPathStep]
    sections: list[GeminiCaseSection]

def get_path_status(db: Session, case_id: uuid.UUID) -> dict:
    """
    Get investigation path generation status.
    If it exists in the database, return status done.
    Otherwise check in-memory jobs, else return not_started.
    """
    # Check if path already exists in DB
    existing_path = db.scalar(
        select(InvestigationPath)
        .options(selectinload(InvestigationPath.steps))
        .where(InvestigationPath.case_id == case_id, InvestigationPath.is_active == True)
    )
    
    if existing_path:
        # Get case sections associated with this case
        case_sections = list(db.scalars(
            select(CaseSection)
            .options(selectinload(CaseSection.legal_section))
            .where(CaseSection.case_id == case_id)
        ))
        
        # Clear job track for case_id as it is done
        if case_id in PATH_JOBS:
            PATH_JOBS.pop(case_id, None)
            
        return {
            "status": "done",
            "message": "Investigation path loaded from database.",
            "path": existing_path,
            "case_sections": case_sections
        }
        
    job = PATH_JOBS.get(case_id)
    if job:
        return {
            "status": job["status"],
            "message": "AI investigation path generation in progress" if job["status"] == "processing" else f"Generation failed: {job.get('error')}",
            "path": None,
            "case_sections": []
        }
        
    return {
        "status": "not_started",
        "message": "No investigation path generated yet. Trigger generation to start.",
        "path": None,
        "case_sections": []
    }

def trigger_path_generation(
    db: Session,
    case_id: uuid.UUID,
    user_id: uuid.UUID,
    background_tasks: BackgroundTasks
) -> dict:
    """
    Trigger investigation path generation in a background task.
    """
    job = PATH_JOBS.get(case_id)
    if job and job["status"] == "processing":
        return {
            "status": "processing",
            "message": "Generation already in progress."
        }
        
    PATH_JOBS[case_id] = {"status": "processing", "error": None}
    
    background_tasks.add_task(
        _generate_path_background,
        case_id=case_id,
        user_id=user_id
    )
    
    return {
        "status": "processing",
        "message": "Investigation path generation started."
    }

def _generate_path_background(case_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """
    Background worker function that initializes its own DB session, retrieves
    SOP chunks, runs Gemini Pro, and updates the database case record.
    """
    db: Session = SessionLocal()
    try:
        generate_investigation_path_sync(db, case_id, user_id)
        PATH_JOBS[case_id] = {"status": "done", "error": None}
        logger.info("Investigation path generated successfully for case=%s", case_id)
    except Exception as e:
        PATH_JOBS[case_id] = {"status": "failed", "error": str(e)}
        logger.error("Failed to generate investigation path for case=%s: %s", case_id, e, exc_info=True)
    finally:
        db.close()

def generate_investigation_path_sync(db: Session, case_id: uuid.UUID, user_id: uuid.UUID) -> InvestigationPath:
    """
    Synchronous generation logic. Called inside background task or run synchronously.
    Delegates to path_revision_service to support revision numbers and triggers.
    """
    from app.services import path_revision_service
    return path_revision_service.generate_path_revision(
        db=db,
        case_id=case_id,
        user_id=user_id,
        trigger_type="complaint",
        change_reason="Initial path generation based on complaint details."
    )

def update_step_status(
    db: Session,
    step_id: uuid.UUID,
    status: StepStatus,
    user_id: uuid.UUID
) -> PathStep:
    """
    Update investigation step status and log an audit event.
    """
    step = db.get(PathStep, step_id)
    if not step:
        raise ValueError("Step not found")
        
    path = db.get(InvestigationPath, step.path_id)
    if not path:
        raise ValueError("Path not found")
        
    old_status = step.status
    step.status = status
    
    audit_service.record(
        db,
        case_id=path.case_id,
        user_id=user_id,
        action="step_status_updated",
        detail={
            "step_id": str(step_id),
            "step_title": step.title,
            "old_status": old_status.value,
            "new_status": status.value
        }
    )
    db.commit()
    db.refresh(step)
    return step


def update_section_status(
    db: Session,
    section_id: uuid.UUID,
    status: str,
    user_id: uuid.UUID
) -> CaseSection:
    """
    Update suggested BNS/BNSS/BSA section review status and write an audit event.
    """
    sec = db.get(CaseSection, section_id)
    if not sec:
        raise ValueError("Case section not found")
        
    old_status = sec.status
    sec.status = status
    
    audit_service.record(
        db,
        case_id=sec.case_id,
        user_id=user_id,
        action="section_reviewed",
        detail={
            "section_id": str(section_id),
            "old_status": old_status,
            "new_status": status
        }
    )
    db.commit()
    db.refresh(sec)
    return sec

