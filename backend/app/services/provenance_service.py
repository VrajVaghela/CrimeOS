import uuid
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.copilot import AiCitation


def create_citation(
    db: Session,
    *,
    case_id: uuid.UUID,
    output_type: str,
    output_id: uuid.UUID,
    source_type: str,
    source_id: str,
    excerpt: str | None = None,
    locator: str | None = None,
    confidence: float | None = None,
) -> AiCitation:
    citation = AiCitation(
        case_id=case_id,
        output_type=output_type,
        output_id=output_id,
        source_type=source_type,
        source_id=source_id,
        excerpt=excerpt,
        locator=locator,
        confidence=confidence,
    )
    db.add(citation)
    db.flush()
    return citation


def get_citations_for_output(db: Session, output_type: str, output_id: uuid.UUID) -> list[AiCitation]:
    return list(
        db.scalars(
            select(AiCitation)
            .where(AiCitation.output_type == output_type, AiCitation.output_id == output_id)
        )
    )


def get_citations_by_ids(db: Session, citation_ids: Sequence[uuid.UUID]) -> list[AiCitation]:
    if not citation_ids:
        return []
    return list(
        db.scalars(
            select(AiCitation).where(AiCitation.id.in_(citation_ids))
        )
    )
