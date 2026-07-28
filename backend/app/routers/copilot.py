import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.copilot import CopilotAskIn, CopilotMessageOut, AiCitationOut
from app.services import copilot_service, provenance_service

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.get("/cases/{case_id}/chat", response_model=list[CopilotMessageOut], summary="Get chat history for a case")
async def get_chat_history(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CopilotMessageOut]:
    messages = copilot_service.get_chat_history(db, case_id)
    out = []
    for msg in messages:
        citations = []
        if msg.role == "assistant":
            db_cits = provenance_service.get_citations_for_output(db, "copilot_message", msg.id)
            citations = [AiCitationOut.model_validate(c) for c in db_cits]

        out.append(CopilotMessageOut(
            id=msg.id,
            case_id=msg.case_id,
            user_id=msg.user_id,
            role=msg.role,
            message=msg.message,
            cited_source_ids=msg.cited_source_ids,
            citations=citations,
            created_at=msg.created_at
        ))
    return out


@router.post("/cases/{case_id}/chat", response_model=CopilotMessageOut, summary="Ask the case-scoped copilot a question")
async def ask_copilot(
    case_id: uuid.UUID,
    body: CopilotAskIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CopilotMessageOut:
    assistant_msg = copilot_service.ask_copilot(
        db,
        case_id=case_id,
        user_id=current_user.id,
        question=body.question
    )

    # Retrieve citations
    db_cits = provenance_service.get_citations_for_output(db, "copilot_message", assistant_msg.id)
    citations = [AiCitationOut.model_validate(c) for c in db_cits]

    return CopilotMessageOut(
        id=assistant_msg.id,
        case_id=assistant_msg.case_id,
        user_id=assistant_msg.user_id,
        role=assistant_msg.role,
        message=assistant_msg.message,
        cited_source_ids=assistant_msg.cited_source_ids,
        citations=citations,
        created_at=assistant_msg.created_at
    )
