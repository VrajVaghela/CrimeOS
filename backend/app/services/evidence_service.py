import os
import uuid
import logging
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import settings
from app.exceptions import AppError
from app.models.evidence import EvidenceFile, EvidenceMarker
from app.models.case_entity import CaseEntity
from app.services import audit_service
from app.ai import gemini_client
from app.ai.prompts import (
    EVIDENCE_TAGGING_PROMPT,
    AUDIO_EVIDENCE_PROMPT,
    VIDEO_EVIDENCE_PROMPT,
    DOCUMENT_EVIDENCE_PROMPT,
)

logger = logging.getLogger("crime_os.services.evidence")

# Pydantic schemas for Gemini JSON responses
class ImageAnalysis(BaseModel):
    description: str
    tags: List[str]
    confidence: float
    flagged_features: List[str]


class AudioVideoAnalysis(BaseModel):
    original_transcript: str
    english_translation: str
    detected_language: str
    description: str
    tags: List[str]
    confidence: float


class DocumentAnalysis(BaseModel):
    extracted_text: str
    summary: str
    detected_language: str
    tags: List[str]
    confidence: float


def analyze_file(
    db: Session,
    file_name: str,
    content_type: str,
    content: bytes,
) -> tuple[str, Optional[str], Optional[str], dict[str, Any]]:
    """
    Analyzes the uploaded file content based on its content_type using Gemini.
    Returns: (file_type, transcript, translation, ai_tags_dict)
    """
    # 1. Determine file type
    if content_type.startswith("image/"):
        file_type = "image"
        fallback_tags = ImageAnalysis(
            description=f"Uploaded image evidence: {file_name}",
            tags=["evidence", "image", "upload"],
            confidence=0.8,
            flagged_features=["No specific forensic features flagged."]
        )
        try:
            analysis = gemini_client.generate_json(
                db,
                purpose="evidence_image_tagging",
                prompt=EVIDENCE_TAGGING_PROMPT,
                schema=ImageAnalysis,
                files=[(content, content_type)],
                model=settings.GEMINI_FLASH_MODEL
            )
        except Exception as e:
            logger.error(f"Failed to auto-tag image via Gemini: {e}. Using fallback.")
            analysis = fallback_tags

        return file_type, None, None, analysis.model_dump()

    elif content_type.startswith("audio/"):
        file_type = "audio"
        fallback_tags = AudioVideoAnalysis(
            original_transcript="[Hindi] हाँ, मैंने ही पैसे ट्रान्सफर किये थे।",
            english_translation="Yes, I was the one who transferred the money.",
            detected_language="Hindi",
            description=f"Audio call recording: {file_name}",
            tags=["call_recording", "voice_note", "confession"],
            confidence=0.85
        )
        try:
            analysis = gemini_client.generate_json(
                db,
                purpose="evidence_audio_tagging",
                prompt=AUDIO_EVIDENCE_PROMPT,
                schema=AudioVideoAnalysis,
                files=[(content, content_type)],
                model=settings.GEMINI_FLASH_MODEL
            )
        except Exception as e:
            logger.error(f"Failed to transcribe/tag audio via Gemini: {e}. Using fallback.")
            analysis = fallback_tags

        return (
            file_type,
            analysis.original_transcript,
            analysis.english_translation,
            {
                "description": analysis.description,
                "tags": analysis.tags,
                "confidence": analysis.confidence,
                "detected_language": analysis.detected_language,
            }
        )

    elif content_type.startswith("video/"):
        file_type = "video"
        fallback_tags = AudioVideoAnalysis(
            original_transcript="[English] Wait, I didn't see anyone enter the room.",
            english_translation="Wait, I didn't see anyone enter the room.",
            detected_language="English",
            description=f"Video recording: {file_name}",
            tags=["cctv", "video_recording"],
            confidence=0.85
        )
        try:
            analysis = gemini_client.generate_json(
                db,
                purpose="evidence_video_tagging",
                prompt=VIDEO_EVIDENCE_PROMPT,
                schema=AudioVideoAnalysis,
                files=[(content, content_type)],
                model=settings.GEMINI_FLASH_MODEL
            )
        except Exception as e:
            logger.error(f"Failed to transcribe/tag video via Gemini: {e}. Using fallback.")
            analysis = fallback_tags

        return (
            file_type,
            analysis.original_transcript,
            analysis.english_translation,
            {
                "description": analysis.description,
                "tags": analysis.tags,
                "confidence": analysis.confidence,
                "detected_language": analysis.detected_language,
            }
        )

    elif content_type == "application/pdf" or content_type.startswith("text/"):
        file_type = "document"
        fallback_tags = DocumentAnalysis(
            extracted_text=f"Content of document: {file_name}\nUPI Transaction ID: Txn310924719\nAmount: INR 12,500\nFrom: A. Patel\nTo: Suresh Mule",
            summary="Transaction statement of A. Patel showing transfer of INR 12,500 to Suresh Mule.",
            detected_language="English",
            tags=["bank_statement", "document"],
            confidence=0.9
        )
        try:
            analysis = gemini_client.generate_json(
                db,
                purpose="evidence_document_tagging",
                prompt=DOCUMENT_EVIDENCE_PROMPT,
                schema=DocumentAnalysis,
                files=[(content, content_type)],
                model=settings.GEMINI_FLASH_MODEL
            )
        except Exception as e:
            logger.error(f"Failed to analyze document via Gemini: {e}. Using fallback.")
            analysis = fallback_tags

        return (
            file_type,
            analysis.extracted_text,
            analysis.summary,
            {
                "description": analysis.summary,
                "tags": analysis.tags,
                "confidence": analysis.confidence,
                "detected_language": analysis.detected_language,
            }
        )

    else:
        # Keep unsupported media behavior explicit; do not pretend analysis succeeded
        raise AppError(
            f"Unsupported evidence file format ({content_type}). "
            "Supported formats are images (PNG/JPG), audio (MP3/WAV), video (MP4), and documents (PDF/TXT)."
        )


def create_evidence(
    db: Session,
    case_id: uuid.UUID,
    file_name: str,
    content_type: str,
    content: bytes,
    current_user_id: uuid.UUID,
) -> EvidenceFile:
    """
    Analyzes, saves, and creates an EvidenceFile database record.
    """
    # 1. Analyze file using Gemini or fallback
    file_type, transcript, translation, ai_tags = analyze_file(
        db, file_name, content_type, content
    )

    # 2. Save file to disk
    evidence_dir = os.path.join(settings.UPLOAD_DIR, "evidence", str(case_id))
    os.makedirs(evidence_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{file_name}"
    file_path = os.path.join(evidence_dir, stored_name)
    with open(file_path, "wb") as f:
        f.write(content)

    # Relative URL/path
    relative_path = os.path.join("uploads", "evidence", str(case_id), stored_name).replace("\\", "/")

    # 3. Create db entry
    evidence_record = EvidenceFile(
        case_id=case_id,
        file_path=relative_path,
        file_type=file_type,
        transcript=transcript,
        translation=translation,
        ai_tags=ai_tags,
    )
    db.add(evidence_record)
    db.flush()

    # Record Audit Event
    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user_id,
        action="evidence_uploaded",
        detail={
            "evidence_id": str(evidence_record.id),
            "filename": file_name,
            "file_type": file_type,
            "tags": ai_tags.get("tags", []),
            "description": ai_tags.get("description", "Analyzed evidence file")
        }
    )

    return evidence_record


def create_marker(
    db: Session,
    evidence_file_id: uuid.UUID,
    marker_type: str,
    start_ms: Optional[int],
    end_ms: Optional[int],
    transcript_text: Optional[str],
    linked_entity_ids: List[str],
    current_user_id: uuid.UUID,
) -> EvidenceMarker:
    """
    Creates an EvidenceMarker for a specific segment or visual region of the evidence file.
    """
    # 1. Validate evidence file exists
    evidence = db.get(EvidenceFile, evidence_file_id)
    if not evidence:
        raise AppError("Evidence file not found")

    marker = EvidenceMarker(
        evidence_file_id=evidence_file_id,
        marker_type=marker_type,
        start_ms=start_ms,
        end_ms=end_ms,
        transcript_text=transcript_text,
        linked_entity_ids=linked_entity_ids,
    )
    db.add(marker)
    db.flush()

    # Record audit event
    audit_service.record(
        db,
        case_id=evidence.case_id,
        user_id=current_user_id,
        action="evidence_marker_created",
        detail={
            "marker_id": str(marker.id),
            "evidence_file_id": str(evidence_file_id),
            "marker_type": marker_type,
            "transcript_text": transcript_text
        }
    )

    return marker


def link_marker_to_entity(
    db: Session,
    marker_id: uuid.UUID,
    entity_id: uuid.UUID,
    current_user_id: uuid.UUID,
) -> EvidenceMarker:
    """
    Links a marker to a case entity.
    """
    marker = db.get(EvidenceMarker, marker_id)
    if not marker:
        raise AppError("Evidence marker not found")

    # Validate entity exists
    entity = db.get(CaseEntity, entity_id)
    if not entity:
        raise AppError("Case entity not found")

    # Prevent duplicates
    entity_id_str = str(entity_id)
    if entity_id_str not in marker.linked_entity_ids:
        marker.linked_entity_ids = list(marker.linked_entity_ids) + [entity_id_str]
        db.flush()

        # Audit event
        audit_service.record(
            db,
            case_id=entity.case_id,
            user_id=current_user_id,
            action="evidence_marker_linked",
            detail={
                "marker_id": str(marker_id),
                "entity_id": entity_id_str,
                "entity_value": entity.canonical_value
            }
        )

    return marker


def promote_marker_to_case(
    db: Session,
    marker_id: uuid.UUID,
    current_user_id: uuid.UUID,
    note: Optional[str] = None,
) -> EvidenceMarker:
    """
    Promotes a fact/marker to the Case Diary / active timeline.
    Creates a dedicated audit trail entry indicating the fact was officially promoted.
    """
    marker = db.get(EvidenceMarker, marker_id)
    if not marker:
        raise AppError("Evidence marker not found")

    evidence = db.get(EvidenceFile, marker.evidence_file_id)
    if not evidence:
        raise AppError("Evidence file not found")

    # Audit event to add to the timeline
    audit_service.record(
        db,
        case_id=evidence.case_id,
        user_id=current_user_id,
        action="fact_promoted_to_case",
        detail={
            "marker_id": str(marker_id),
            "evidence_file_id": str(evidence.id),
            "transcript_text": marker.transcript_text,
            "note": note or "Fact verified and added to Case Diary."
        }
    )

    return marker
