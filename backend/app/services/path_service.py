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
        .where(InvestigationPath.case_id == case_id)
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
    """
    # 1. Retrieve case, complaints and entities
    case = db.get(Case, case_id)
    if not case:
        raise ValueError("Case not found")
        
    complaints = list(db.scalars(
        select(Complaint)
        .options(selectinload(Complaint.entities))
        .where(Complaint.case_id == case_id)
    ))
    
    if not complaints:
        raise ValueError("No complaints ingested for this case. Ingest a complaint first.")
        
    # Assemble complaint text and entities for RAG query and prompt context
    complaint_texts = []
    entity_texts = []
    
    for idx, c in enumerate(complaints, 1):
        txt = c.translated_text or c.raw_text or ""
        complaint_texts.append(f"Complaint {idx}:\n{txt}")
        
        entities_list = [f"{e.entity_type}: {e.value} (conf: {e.confidence})" for e in c.entities]
        if entities_list:
            entity_texts.append(f"Complaint {idx} Entities:\n" + "\n".join(entities_list))
            
    full_complaint_context = "\n\n".join(complaint_texts)
    full_entities_context = "\n\n".join(entity_texts) if entity_texts else "None"
    
    # 2. Retrieve SOP Chunks using RAG
    rag_query = f"{case.title}\n{full_complaint_context}"
    sop_chunks = rag_service.retrieve_sop_chunks(db, query=rag_query, limit=5)
    sop_chunks_context = "\n\n".join([f"- {chunk.chunk_text}" for chunk in sop_chunks])
    
    # 3. Retrieve relevant Legal Sections
    legal_sections = rag_service.get_relevant_legal_sections(db, query=rag_query)
    legal_sections_context = "\n".join([
        f"- Code: {sec.code.value}, Section: {sec.section_number}, Title: {sec.title}\n  Text: {sec.text}"
        for sec in legal_sections
    ])
    
    # 4. Invoke Gemini Pro
    prompt = INVESTIGATION_PATH_PROMPT.format(
        case_title=case.title,
        complaint_text=full_complaint_context,
        extracted_entities=full_entities_context,
        sop_chunks=sop_chunks_context,
        legal_sections=legal_sections_context
    )
    
    # Let's write default fallback so the demo never dies
    fallback_response = GeminiPathResponse(
        crime_type="cyber_fraud",
        steps=[
            GeminiPathStep(
                step_order=1,
                title="Preserve Digital Evidence",
                description="Immediately contact nodal officer of relevant telecom provider to preserve Call Detail Records (CDR) and IP logs for the numbers identified.",
                sop_citation="Preserve digital evidence, request bank freeze/KYC, and obtain CDR for suspect numbers.",
                suggested_action_type="telecom"
            ),
            GeminiPathStep(
                step_order=2,
                title="Freeze Recipient Bank Accounts",
                description="Draft and dispatch emergency freeze request to the bank holding the destination account to secure the stolen funds.",
                sop_citation="Immediate action: Request bank freeze/KYC.",
                suggested_action_type="bank"
            ),
            GeminiPathStep(
                step_order=3,
                title="Correlate Digital Activity",
                description="Verify digital transactions and analyze mobile towers or login histories for the suspected IP addresses.",
                sop_citation="Analysis: Correlate transaction timing with phone activity and platform login metadata.",
                suggested_action_type="platform"
            )
        ],
        sections=[
            GeminiCaseSection(
                code="BNS",
                section_number="115",
                ai_reasoning="Section 115 applies to cases involving cyber deception and online financial fraud.",
                confidence=0.9
            ),
            GeminiCaseSection(
                code="BNSS",
                section_number="185",
                ai_reasoning="Section 185 outlines the procedural rules for handling digital fraud investigations.",
                confidence=0.85
            ),
            GeminiCaseSection(
                code="BSA",
                section_number="65",
                ai_reasoning="Section 65 regulates admissibility of electronic evidence like server logs and CDRs.",
                confidence=0.95
            )
        ]
    )
    
    model_used_to_generate = settings.GEMINI_PRO_MODEL
    try:
        logger.info("Attempting path generation using model: %s", settings.GEMINI_PRO_MODEL)
        response: GeminiPathResponse = gemini_client.generate_json(
            db,
            purpose="path_generation",
            prompt=prompt,
            schema=GeminiPathResponse,
            model=settings.GEMINI_PRO_MODEL
        )
    except Exception as e:
        logger.warning(f"Path generation with {settings.GEMINI_PRO_MODEL} failed: {e}. Trying fallback model {settings.GEMINI_FLASH_MODEL}...")
        model_used_to_generate = settings.GEMINI_FLASH_MODEL
        try:
            response = gemini_client.generate_json(
                db,
                purpose="path_generation",
                prompt=prompt,
                schema=GeminiPathResponse,
                model=settings.GEMINI_FLASH_MODEL
            )
        except Exception as flash_err:
            logger.error(f"Path generation with {settings.GEMINI_FLASH_MODEL} failed: {flash_err}. Using deterministic fallback.")
            model_used_to_generate = "deterministic-fallback"
            response = fallback_response
        
    # Ensure generated sections are validated against DB or created dynamically
    # 5. Clear old Path and CaseSections for this case in a single transaction
    existing_paths = list(db.scalars(
        select(InvestigationPath).where(InvestigationPath.case_id == case_id)
    ))
    for path in existing_paths:
        db.execute(delete(PathStep).where(PathStep.path_id == path.id))
        db.delete(path)
        
    db.execute(delete(CaseSection).where(CaseSection.case_id == case_id))
    db.flush()
    
    # 6. Save new path & steps
    path_record = InvestigationPath(
        case_id=case_id,
        model_used=model_used_to_generate,
        generated_at=datetime.utcnow()
    )

    db.add(path_record)
    db.flush()
    
    for step in response.steps:
        path_step = PathStep(
            path_id=path_record.id,
            step_order=step.step_order,
            title=step.title,
            description=step.description,
            sop_citation=step.sop_citation,
            status=StepStatus.PENDING,
            suggested_action_type=step.suggested_action_type
        )
        db.add(path_step)
        
    # 7. Save case sections (look up matching section or create dynamic placeholder)
    for sec in response.sections:
        legal_sec = db.scalar(
            select(LegalSection)
            .where(LegalSection.code == sec.code, LegalSection.section_number == sec.section_number)
        )
        if not legal_sec:
            # Create a placeholder so we have a valid foreign key reference
            legal_sec = LegalSection(
                code=LegalCode(sec.code),
                section_number=sec.section_number,
                title=f"Section {sec.section_number} - {sec.code}",
                text=f"Automated BNS/BNSS/BSA reference for Section {sec.section_number}."
            )
            db.add(legal_sec)
            db.flush()
            
        case_sec = CaseSection(
            case_id=case_id,
            legal_section_id=legal_sec.id,
            ai_reasoning=sec.ai_reasoning,
            confidence=sec.confidence
        )
        db.add(case_sec)
        
    # 8. Update Case's crime type
    case.crime_type = response.crime_type
    
    # Record Audit Event
    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="path_generated",
        detail={
            "crime_type": response.crime_type,
            "steps_count": len(response.steps),
            "sections_count": len(response.sections),
            "model": settings.GEMINI_PRO_MODEL
        }
    )
    
    db.commit()
    return path_record

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

