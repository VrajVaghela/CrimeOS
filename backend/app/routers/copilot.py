import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_lang
from app.models import User
from app.models.copilot import CopilotMessage
from app.schemas.copilot import CopilotAskIn, CopilotMessageOut, AiCitationOut
from app.services import copilot_service, provenance_service

router = APIRouter(prefix="/copilot", tags=["copilot"])


def _to_out(msg: CopilotMessage, citations: list[AiCitationOut]) -> CopilotMessageOut:
    """Map a stored message to the wire shape.

    `message` carries the localized copy when one exists so a reloaded chat history
    still renders in the language each answer was generated for; `message_en` always
    carries the authoritative English text (Phase 14D).
    """
    return CopilotMessageOut(
        id=msg.id,
        case_id=msg.case_id,
        user_id=msg.user_id,
        role=msg.role,
        message=msg.message_localized or msg.message,
        message_en=msg.message,
        lang=msg.lang or "en",
        cited_source_ids=msg.cited_source_ids,
        citations=citations,
        created_at=msg.created_at,
    )


@router.get("/cases/{case_id}/chat", response_model=list[CopilotMessageOut], summary="Get chat history for a case")
async def get_chat_history(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CopilotMessageOut]:
    messages = copilot_service.get_chat_history(db, case_id)
    out = []
    for msg in messages:
        citations: list[AiCitationOut] = []
        if msg.role == "assistant":
            db_cits = provenance_service.get_citations_for_output(db, "copilot_message", msg.id)
            citations = [AiCitationOut.model_validate(c) for c in db_cits]

        out.append(_to_out(msg, citations))
    return out


@router.post("/cases/{case_id}/chat", response_model=CopilotMessageOut, summary="Ask the case-scoped copilot a question")
async def ask_copilot(
    case_id: uuid.UUID,
    body: CopilotAskIn,
    current_user: User = Depends(get_current_user),
    header_lang: str = Depends(get_lang),
    db: Session = Depends(get_db),
) -> CopilotMessageOut:
    # An explicit body.lang overrides the X-Lang header; the header is the normal path.
    lang = body.lang or header_lang

    assistant_msg = copilot_service.ask_copilot(
        db,
        case_id=case_id,
        user_id=current_user.id,
        question=body.question,
        lang=lang,
        intent=body.intent,
    )

    # Retrieve citations
    db_cits = provenance_service.get_citations_for_output(db, "copilot_message", assistant_msg.id)
    citations = [AiCitationOut.model_validate(c) for c in db_cits]

    return _to_out(assistant_msg, citations)
