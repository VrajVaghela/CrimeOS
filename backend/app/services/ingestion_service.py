"""
Ingestion service: handles file storage and AI transcription/OCR for Phase 2.

Flow:
  1. Save uploaded file to uploads/{case_id}/
  2. Send to Gemini (transcribe helper for audio; inline-bytes for PDF/image)
  3. Store raw_text + detected_language + translated_text in Complaint record
  4. Kick off extraction_service.extract_entities
  5. Write audit event and commit

NOTE (hackathon): process_complaint creates its own DB session rather than reusing
the request session, because FastAPI closes the request's session once the 202 response
is returned. For production, use a proper worker queue (Celery / ARQ).
"""
import logging
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.ai import gemini_client
from app.ai.prompts import INGESTION_TRANSCRIPTION_PROMPT
from app.config import settings
from app.database import SessionLocal
from app.models import Complaint, SourceType
from app.services import audit_service, extraction_service

logger = logging.getLogger("crime_os.ingestion")

UPLOAD_ROOT = Path(settings.UPLOAD_DIR)

MIME_MAP: dict[str, str] = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".webm": "audio/webm",
    ".txt": "text/plain",
}


def _detect_language_from_text(text: str) -> str:
    """Heuristic language detection from transcribed text using Unicode ranges."""
    gujarati_chars = sum(1 for c in text if "\u0a80" <= c <= "\u0aff")
    devanagari_chars = sum(1 for c in text if "\u0900" <= c <= "\u097f")
    if gujarati_chars > 5:
        return "gu"
    if devanagari_chars > 5:
        return "hi"
    return "en"


def save_upload(case_id: uuid.UUID, filename: str, content: bytes) -> Path:
    """Save uploaded bytes to uploads/{case_id}/filename.

    Returns the absolute path of the saved file.
    """
    dest_dir = UPLOAD_ROOT / str(case_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name or "upload"
    dest = dest_dir / safe_name
    dest.write_bytes(content)
    logger.info("saved_upload case=%s file=%s size=%d", case_id, safe_name, len(content))
    return dest


def process_complaint(complaint_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Background task: transcribe / OCR the uploaded file, then extract entities.

    Opens its own DB session so it is not affected by the request session lifecycle.
    """
    db: Session = SessionLocal()
    try:
        complaint = db.get(Complaint, complaint_id)
        if not complaint:
            logger.error("process_complaint: complaint %s not found", complaint_id)
            return

        file_path = Path(complaint.original_file_path or "")
        if not file_path.exists():
            logger.error("process_complaint: file not found %s", file_path)
            return

        suffix = file_path.suffix.lower()
        mime_type = MIME_MAP.get(suffix, "application/octet-stream")
        content = file_path.read_bytes()
        is_audio = mime_type.startswith("audio/")
        is_text = mime_type == "text/plain"

        try:
            if is_text:
                plain_text = content.decode("utf-8", errors="ignore")
                prompt_payload = f"{INGESTION_TRANSCRIPTION_PROMPT}\n\nComplaint Content:\n{plain_text}"
                raw_text = gemini_client.generate_text(
                    db,
                    purpose="complaint_transcription",
                    prompt=prompt_payload,
                )
            elif is_audio:
                raw_text = gemini_client.transcribe(
                    db,
                    purpose="complaint_transcription",
                    prompt=INGESTION_TRANSCRIPTION_PROMPT,
                    content=content,
                    mime_type=mime_type,
                )
            else:
                # PDF or image — pass inline bytes through gemini_client.transcribe
                # (same underlying generate_content call, works for both modalities)
                raw_text = gemini_client.transcribe(
                    db,
                    purpose="complaint_transcription",
                    prompt=INGESTION_TRANSCRIPTION_PROMPT,
                    content=content,
                    mime_type=mime_type,
                )

            detected_language = _detect_language_from_text(raw_text)

            # Split original / translated sections if Gemini followed the prompt structure
            translated_text = raw_text  # fallback: entire response is the translation
            for separator in (
                "English translation:\n",       # primary: matches our prompt format
                "\n\nEnglish translation:",      # alternative Gemini format
                "\n\nTranslation:",
                "\n\nEnglish Translation:",
            ):
                if separator in raw_text:
                    parts = raw_text.split(separator, 1)
                    raw_text = parts[0].strip()   # everything before = original text
                    translated_text = parts[1].strip()
                    break

            complaint.raw_text = raw_text
            complaint.translated_text = translated_text
            complaint.detected_language = detected_language
            db.flush()

            # Entity extraction (flushes but does not commit)
            extraction_service.extract_entities(db, complaint_id=complaint_id)

            # Sync case entities and build initial relationships
            from app.services import entity_service
            entity_service.sync_case_entities(db, case_id=complaint.case_id)

            audit_service.record(
                db,
                case_id=complaint.case_id,
                user_id=user_id,
                action="complaint_processed",
                detail={
                    "complaint_id": str(complaint_id),
                    "language": detected_language,
                    "source_type": complaint.source_type.value,
                },
            )
            db.commit()
            logger.info("complaint_processed complaint=%s language=%s", complaint_id, detected_language)

        except Exception as exc:
            db.rollback()
            logger.error("process_complaint_failed complaint=%s error=%s", complaint_id, exc, exc_info=True)

    finally:
        db.close()
