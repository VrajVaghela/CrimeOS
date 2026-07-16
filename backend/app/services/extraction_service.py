"""
Extraction service: uses Gemini JSON mode to extract structured entities from complaint text.

Called by ingestion_service.process_complaint inside the same DB transaction.
Does NOT commit — the caller (ingestion_service) commits after audit logging.
"""
import logging
import uuid

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai import gemini_client
from app.ai.prompts import EXTRACTION_PROMPT
from app.models import Complaint, ExtractedEntity

logger = logging.getLogger("crime_os.extraction")


class _RawEntity(BaseModel):
    entity_type: str
    value: str
    confidence: float


class _ExtractionResult(BaseModel):
    entities: list[_RawEntity]


def extract_entities(db: Session, *, complaint_id: uuid.UUID) -> list[ExtractedEntity]:
    """Extract structured entities from the complaint's translated_text using Gemini JSON mode.

    Flushes new ExtractedEntity rows but does NOT commit — caller is responsible.
    """
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        logger.error("extract_entities: complaint %s not found", complaint_id)
        return []

    text = complaint.translated_text or complaint.raw_text or ""
    if not text.strip():
        logger.warning("extract_entities: empty text for complaint %s", complaint_id)
        return []

    prompt = EXTRACTION_PROMPT.format(text=text)

    try:
        result: _ExtractionResult = gemini_client.generate_json(
            db,
            purpose="entity_extraction",
            prompt=prompt,
            schema=_ExtractionResult,
        )
        entities: list[ExtractedEntity] = []
        for raw in result.entities:
            entity = ExtractedEntity(
                complaint_id=complaint_id,
                entity_type=raw.entity_type,
                value=raw.value,
                confidence=max(0.0, min(1.0, raw.confidence)),
            )
            db.add(entity)
            entities.append(entity)
        db.flush()
        logger.info("extracted_entities complaint=%s count=%d", complaint_id, len(entities))
        return entities
    except Exception as exc:
        logger.error("extract_entities_failed complaint=%s error=%s", complaint_id, exc)
        return []
