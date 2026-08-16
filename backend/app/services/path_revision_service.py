import logging
import uuid
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import SessionLocal
from app.models import (
    Case,
    Complaint,
    CaseEntity,
    ExtractedEntity,
    InvestigationPath,
    PathStep,
    CaseSection,
    LegalSection
)
from app.models.enums import StepStatus, LegalCode
from app.ai import gemini_client
from app.ai.prompts import INVESTIGATION_PATH_REVISION_PROMPT
from app.services import audit_service, rag_service, entity_service

logger = logging.getLogger("crime_os.path_revision_service")


class GeminiPathStep(BaseModel):
    step_order: int
    title: str
    description: str
    sop_citation: str
    suggested_action_type: str | None = None


class GeminiCaseSection(BaseModel):
    code: str
    section_number: str
    ai_reasoning: str
    confidence: float


class GeminiPathRevisionResponse(BaseModel):
    crime_type: str
    change_explanation: str
    steps: list[GeminiPathStep]
    sections: list[GeminiCaseSection]


def generate_path_revision(
    db: Session,
    case_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
    trigger_type: str = "complaint",  # "complaint", "entities_verified", "evidence", "provider_response", "manual"
    change_reason: str | None = None
) -> InvestigationPath:
    """Generate a new append-only investigation path revision for a case based on a trigger event."""
    logger.info("Generating path revision for case_id=%s, trigger=%s", case_id, trigger_type)

    case = db.get(Case, case_id)
    if not case:
        raise ValueError("Case not found")

    # Get active path
    active_path = db.scalar(
        select(InvestigationPath)
        .options(selectinload(InvestigationPath.steps))
        .where(InvestigationPath.case_id == case_id, InvestigationPath.is_active == True)
    )

    revision_number = 1
    parent_path_id = None
    previous_steps_text = "No previous investigation path exists."

    if active_path:
        revision_number = active_path.revision_number + 1
        parent_path_id = active_path.id
        steps_list = sorted(active_path.steps, key=lambda s: s.step_order)
        previous_steps_text = "\n".join([
            f"Step {s.step_order}: {s.title} ({s.status.value})\n  Desc: {s.description}"
            for s in steps_list
        ])

    # Synchronize entities first to make sure we have the latest
    entity_service.sync_case_entities(db, case_id)

    # Gather case details
    complaints = list(db.scalars(
        select(Complaint).where(Complaint.case_id == case_id)
    ))
    if not complaints:
        raise ValueError("No complaints ingested for this case.")

    complaint_texts = []
    for idx, c in enumerate(complaints, 1):
        txt = c.translated_text or c.raw_text or ""
        complaint_texts.append(f"Complaint {idx}:\n{txt}")
    full_complaint_context = "\n\n".join(complaint_texts)

    # Gather current case entities
    case_entities = list(db.scalars(
        select(CaseEntity).where(CaseEntity.case_id == case_id)
    ))
    entity_texts = [f"- {e.entity_type}: {e.display_value} (confidence: {e.confidence:.2f})" for e in case_entities]
    full_entities_context = "\n".join(entity_texts) if entity_texts else "None"

    # SOP chunks RAG
    rag_query = f"{case.title}\n{full_complaint_context}\nTrigger: {change_reason or ''}"
    sop_chunks = rag_service.retrieve_sop_chunks(db, query=rag_query, limit=5)
    sop_chunks_context = "\n\n".join([f"- {chunk.chunk_text}" for chunk in sop_chunks])

    # Relevant legal sections
    legal_sections = rag_service.get_relevant_legal_sections(db, query=rag_query)
    legal_sections_context = "\n".join([
        f"- Code: {sec.code.value}, Section: {sec.section_number}, Title: {sec.title}\n  Text: {sec.text}"
        for sec in legal_sections
    ])

    prompt = INVESTIGATION_PATH_REVISION_PROMPT.format(
        case_title=case.title,
        complaint_text=full_complaint_context,
        extracted_entities=full_entities_context,
        trigger_type=trigger_type,
        change_reason=change_reason or "Update requested",
        previous_path_steps=previous_steps_text,
        sop_chunks=sop_chunks_context,
        legal_sections=legal_sections_context
    )

    fallback_response = GeminiPathRevisionResponse(
        crime_type=case.crime_type or "cyber_fraud",
        change_explanation=f"Investigation path updated due to {trigger_type}: {change_reason or 'routine update'}.",
        steps=[
            GeminiPathStep(
                step_order=1,
                title="Review New Event/Evidence Details",
                description=f"Analyze the incoming data trigger ({trigger_type}) and verify linked contacts/accounts.",
                sop_citation="Intake: Capture victim identity, transaction IDs, bank account numbers, UPI handles, phone numbers, and exact timestamps.",
                suggested_action_type=None
            ),
            GeminiPathStep(
                step_order=2,
                title="Preserve Suspect Assets & Logs",
                description="Immediately dispatch preservation / freeze requests for any newly identified bank accounts, IPs, or phone logs.",
                sop_citation="Immediate action: Preserve digital evidence, request bank freeze/KYC, and obtain CDR.",
                suggested_action_type="bank"
            ),
            GeminiPathStep(
                step_order=3,
                title="Conduct Multi-source Correlation",
                description="Cross-reference transaction routing, CDR tower locations, and social media footprints to establish linkage.",
                sop_citation="Analysis: Correlate transaction timing with phone activity and platform login metadata.",
                suggested_action_type="platform"
            )
        ],
        sections=[
            GeminiCaseSection(
                code="BNS",
                section_number="115",
                ai_reasoning="Applicable under cyber financial fraud and deception provisions.",
                confidence=0.9
            ),
            GeminiCaseSection(
                code="BNSS",
                section_number="185",
                ai_reasoning="Procedural search and seizure rules for electronic devices/records.",
                confidence=0.85
            ),
            GeminiCaseSection(
                code="BSA",
                section_number="65",
                ai_reasoning="Admissibility criteria for electronic log evidence.",
                confidence=0.95
            )
        ]
    )

    model_used = settings.GEMINI_PRO_MODEL
    try:
        response: GeminiPathRevisionResponse = gemini_client.generate_json(
            db,
            purpose=f"path_revision_{case_id}_{revision_number}",
            prompt=prompt,
            schema=GeminiPathRevisionResponse,
            model=settings.GEMINI_PRO_MODEL
        )
        # The gateway may have served this locally, so record the engine that actually ran.
        model_used = gemini_client.last_route()
    except Exception as exc:
        logger.warning("Path revision generation with Pro failed: %s. Trying Flash...", exc)
        model_used = settings.GEMINI_FLASH_MODEL
        try:
            response = gemini_client.generate_json(
                db,
                purpose=f"path_revision_{case_id}_{revision_number}",
                prompt=prompt,
                schema=GeminiPathRevisionResponse,
                model=settings.GEMINI_FLASH_MODEL
            )
            model_used = gemini_client.last_route()
        except Exception as flash_exc:
            logger.error("Path revision with Flash failed: %s. Using deterministic fallback.", flash_exc)
            model_used = "deterministic-fallback"
            response = fallback_response

    # Deactivate all existing paths
    db.execute(
        update(InvestigationPath)
        .where(InvestigationPath.case_id == case_id)
        .values(is_active=False)
    )
    db.flush()

    # Create new path revision
    new_path = InvestigationPath(
        case_id=case_id,
        parent_path_id=parent_path_id,
        revision_number=revision_number,
        trigger_type=trigger_type,
        change_reason=response.change_explanation,
        is_active=True,
        model_used=model_used
    )
    db.add(new_path)
    db.flush()

    # Create steps
    for step in response.steps:
        path_step = PathStep(
            path_id=new_path.id,
            step_order=step.step_order,
            title=step.title,
            description=step.description,
            sop_citation=step.sop_citation,
            status=StepStatus.PENDING,
            suggested_action_type=step.suggested_action_type
        )
        db.add(path_step)

    # Save legal sections (clear previous case sections first)
    db.execute(
        update(CaseSection)
        .where(CaseSection.case_id == case_id)
        .values(status="superseded")  # or delete, let's just delete for simplicity like before
    )
    from sqlalchemy import delete as sqldelete
    db.execute(sqldelete(CaseSection).where(CaseSection.case_id == case_id))

    for sec in response.sections:
        legal_sec = db.scalar(
            select(LegalSection)
            .where(LegalSection.code == sec.code, LegalSection.section_number == sec.section_number)
        )
        if not legal_sec:
            legal_sec = LegalSection(
                code=LegalCode(sec.code),
                section_number=sec.section_number,
                title=f"Section {sec.section_number} - {sec.code}",
                text=f"Automated reference for {sec.code} Section {sec.section_number}."
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

    case.crime_type = response.crime_type
    db.flush()

    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="path_revised",
        detail={
            "revision_number": revision_number,
            "trigger_type": trigger_type,
            "change_explanation": response.change_explanation,
            "crime_type": response.crime_type,
            "steps_count": len(response.steps)
        }
    )
    db.commit()
    return new_path
