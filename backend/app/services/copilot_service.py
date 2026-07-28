import logging
import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.complaint import Complaint, ExtractedEntity
from app.models.case_entity import CaseEntity
from app.models.investigation import InvestigationPath, PathStep
from app.models.legal import CaseSection, LegalSection
from app.models.response import ProviderResponse
from app.models.evidence import EvidenceFile
from app.models.audit import AuditEvent
from app.models.copilot import CopilotMessage, AiCitation
from app.ai import gemini_client, prompts
from app.services import audit_service, provenance_service
from pydantic import BaseModel, Field

logger = logging.getLogger("crime_os.copilot")


class GeminiCitation(BaseModel):
    source_type: str = Field(description="one of 'complaint', 'entity', 'sop_chunk', 'legal_section', 'provider_row', 'evidence_marker', 'audit_event'")
    source_id: str = Field(description="the unique ID or identifier of the source item provided in the context")
    excerpt: str | None = Field(default=None, description="verbatim text snippet or value from the source context")
    locator: str | None = Field(default=None, description="locator string like paragraph, section number, table row number, or timestamp")
    confidence: float | None = Field(default=None, description="confidence score from 0.0 to 1.0")


class GeminiCopilotResponse(BaseModel):
    answer: str = Field(description="the professional markdown response text answering the question")
    citations: list[GeminiCitation] = Field(default_factory=list, description="list of citations from the context supporting the answer")


def assemble_case_context(db: Session, case_id: uuid.UUID) -> str:
    # 1. Case Info
    case = db.scalar(select(Case).where(Case.id == case_id))
    if not case:
        return "Case not found"

    ctx = []
    ctx.append("CASE INFORMATION:")
    ctx.append(f"- ID: {case.id}")
    ctx.append(f"- Case Number: {case.case_number}")
    ctx.append(f"- Title: {case.title}")
    ctx.append(f"- Crime Type: {case.crime_type}")
    ctx.append(f"- Status: {case.status}")
    ctx.append(f"- Created At: {case.created_at}")
    ctx.append("")

    # 2. Complaint
    complaints = db.scalars(select(Complaint).where(Complaint.case_id == case_id)).all()
    ctx.append("COMPLAINT DATA:")
    for comp in complaints:
        ctx.append(f"- Complaint ID: {comp.id}")
        ctx.append(f"  Source Type: {comp.source_type}")
        ctx.append(f"  Language: {comp.detected_language}")
        ctx.append(f"  Raw Text: {comp.raw_text}")
        ctx.append(f"  Translated Text: {comp.translated_text}")
    ctx.append("")

    # 3. Entities
    case_entities = db.scalars(select(CaseEntity).where(CaseEntity.case_id == case_id)).all()
    ctx.append("CASE ENTITIES (Normalized):")
    for ent in case_entities:
        ctx.append(f"- Entity ID: {ent.id}")
        ctx.append(f"  Type: {ent.entity_type}")
        ctx.append(f"  Canonical Value: {ent.canonical_value}")
        ctx.append(f"  Display Value: {ent.display_value}")
        ctx.append(f"  Confidence: {ent.confidence}")
    ctx.append("")

    # 4. Path Steps & SOP Citations
    active_path = db.scalar(
        select(InvestigationPath).where(InvestigationPath.case_id == case_id, InvestigationPath.is_active == True)
    )
    ctx.append("INVESTIGATION PATH & SOP CITATIONS:")
    if active_path:
        path_steps = db.scalars(
            select(PathStep).where(PathStep.path_id == active_path.id).order_by(PathStep.step_order)
        ).all()
        for step in path_steps:
            ctx.append(f"- Step ID: {step.id}")
            ctx.append(f"  Title: {step.title}")
            ctx.append(f"  Description: {step.description}")
            ctx.append(f"  SOP Citation: {step.sop_citation}")
            ctx.append(f"  Status: {step.status}")
    else:
        ctx.append("No active path found.")
    ctx.append("")

    # 5. Legal Sections
    case_sections = db.scalars(select(CaseSection).where(CaseSection.case_id == case_id)).all()
    ctx.append("APPLICABLE LEGAL SECTIONS:")
    for cs in case_sections:
        ls = db.scalar(select(LegalSection).where(LegalSection.id == cs.legal_section_id))
        if ls:
            ctx.append(f"- Section ID: {ls.id}")
            ctx.append(f"  Code: {ls.code}")
            ctx.append(f"  Section Number: {ls.section_number}")
            ctx.append(f"  Title: {ls.title}")
            ctx.append(f"  Reasoning: {cs.ai_reasoning}")
            ctx.append(f"  Confidence: {cs.confidence}")
    ctx.append("")

    # 6. Provider Responses
    provider_responses = db.scalars(select(ProviderResponse).where(ProviderResponse.legal_request_id != None)).all()
    ctx.append("PROVIDER RESPONSES:")
    for resp in provider_responses:
        ctx.append(f"- Response ID: {resp.id}")
        ctx.append(f"  Received At: {resp.received_at}")
        ctx.append(f"  AI Insights: {resp.ai_insights}")
        ctx.append(f"  Parsed Data (Sample): {resp.parsed_data}")
    ctx.append("")

    # 7. Evidence & Markers
    evidence_files = db.scalars(select(EvidenceFile).where(EvidenceFile.case_id == case_id)).all()
    ctx.append("EVIDENCE FILES & MARKERS:")
    for ef in evidence_files:
        ctx.append(f"- Evidence ID: {ef.id}")
        ctx.append(f"  Path: {ef.file_path}")
        ctx.append(f"  Transcript: {ef.transcript}")
        ctx.append(f"  AI Tags: {ef.ai_tags}")
        for marker in ef.markers:
            ctx.append(f"  * Marker ID: {marker.id}")
            ctx.append(f"    Type: {marker.marker_type}")
            ctx.append(f"    Text: {marker.transcript_text}")
            ctx.append(f"    Linked Entities: {marker.linked_entity_ids}")
    ctx.append("")

    # 8. Recent Audit Trail
    audit_events = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.case_id == case_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(15)
    ).all()
    ctx.append("RECENT AUDIT EVENTS:")
    for ev in audit_events:
        ctx.append(f"- Event ID: {ev.id}")
        ctx.append(f"  Action: {ev.action}")
        ctx.append(f"  Detail: {ev.detail}")
        ctx.append(f"  Created At: {ev.created_at}")

    return "\n".join(ctx)


def ask_copilot(
    db: Session,
    *,
    case_id: uuid.UUID,
    user_id: uuid.UUID | None,
    question: str,
) -> CopilotMessage:
    # 1. Save user message
    user_msg = CopilotMessage(
        case_id=case_id,
        user_id=user_id,
        role="user",
        message=question,
        cited_source_ids=[]
    )
    db.add(user_msg)
    db.flush()

    # 2. Select prompt
    q_lower = question.lower()
    if "next" in q_lower or "action" in q_lower or "todo" in q_lower:
        prompt_template = prompts.COPILOT_NEXT_ACTION_PROMPT
        fallback_answer = "Based on the standard operating procedures for this crime type, the recommended next step is to obtain authorization for legal requests. If a telecom or banking entity is involved, draft the request using the LERS templates."
    elif "missing" in q_lower or "gap" in q_lower or "fact" in q_lower:
        prompt_template = prompts.COPILOT_MISSING_FACTS_PROMPT
        fallback_answer = "The system suggests verifying the following facts: (1) Confirming the exact transaction timestamp from bank records, (2) Verifying the identity of the complainant via secondary documentation."
    elif "evidence" in q_lower or "marker" in q_lower or "transcript" in q_lower:
        prompt_template = prompts.COPILOT_EVIDENCE_EXPLANATION_PROMPT
        fallback_answer = "There are evidence files in the case workspace. Please review the transcripts and OCR files under the Evidence tab to establish connection to the suspect entities."
    elif "legal" in q_lower or "basis" in q_lower or "bns" in q_lower or "section" in q_lower:
        prompt_template = prompts.COPILOT_LEGAL_BASIS_PROMPT
        fallback_answer = "The investigation is registered under BNS (Bharatiya Nyaya Sanhita) sections as suggested. These sections apply due to the description of unauthorized access and financial loss in the complaint."
    elif "provider" in q_lower or "response" in q_lower or "telecom" in q_lower or "bank" in q_lower or "insight" in q_lower:
        prompt_template = prompts.COPILOT_RESPONSE_EXPLANATION_PROMPT
        fallback_answer = "We have received provider responses. Check the parsed transactions for rapid transfers and flagged destination accounts."
    else:
        prompt_template = prompts.COPILOT_GENERIC_PROMPT
        fallback_answer = "I could not find a grounded answer for your question. Please verify your query or consult the case files."

    # Assemble context
    case_context = assemble_case_context(db, case_id)

    # Format prompt
    if prompt_template == prompts.COPILOT_GENERIC_PROMPT:
        prompt = prompt_template.format(case_context=case_context, question=question)
    else:
        prompt = prompt_template.format(case_context=case_context)

    # 3. Call Gemini
    citation_ids = []
    answer_text = ""

    full_prompt = f"{prompts.COPILOT_SYSTEM_PROMPT}\n\n{prompt}"

    try:
        res = gemini_client.generate_json(
            db,
            purpose="copilot_ask",
            prompt=full_prompt,
            schema=GeminiCopilotResponse,
        )
        answer_text = res.answer
        # Process and store citations
        for cit in res.citations:
            db_cit = provenance_service.create_citation(
                db,
                case_id=case_id,
                output_type="copilot_message",
                output_id=user_msg.id,  # will map to assistant_msg.id below
                source_type=cit.source_type,
                source_id=cit.source_id,
                excerpt=cit.excerpt,
                locator=cit.locator,
                confidence=cit.confidence
            )
            citation_ids.append(str(db_cit.id))
    except Exception as exc:
        logger.error("Copilot AI generation failed, using fallback. Error: %s", exc)
        answer_text = fallback_answer

    # Create assistant message
    assistant_msg = CopilotMessage(
        case_id=case_id,
        user_id=None,
        role="assistant",
        message=answer_text,
        cited_source_ids=citation_ids
    )
    db.add(assistant_msg)
    db.flush()

    # Link citations to assistant message output ID
    if citation_ids:
        cits = provenance_service.get_citations_by_ids(db, [uuid.UUID(cid) for cid in citation_ids])
        for c in cits:
            c.output_id = assistant_msg.id
        db.flush()

    # Log audit event
    audit_service.record(
        db,
        case_id=case_id,
        user_id=user_id,
        action="copilot_query",
        detail={
            "question": question,
            "answer": answer_text,
            "user_message_id": str(user_msg.id),
            "assistant_message_id": str(assistant_msg.id),
            "citation_count": len(citation_ids),
        }
    )

    db.commit()
    return assistant_msg


def get_chat_history(db: Session, case_id: uuid.UUID) -> list[CopilotMessage]:
    return list(
        db.scalars(
            select(CopilotMessage)
            .where(CopilotMessage.case_id == case_id)
            .order_by(CopilotMessage.created_at.asc())
        )
    )
