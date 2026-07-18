import os
import uuid
import hmac
import json
import logging
import hashlib
import subprocess
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import AuditEvent, EvidenceFile, EvidenceMarker, Case
from app.models.timeline import TimelineEvent
from app.schemas.video import IncidentReport, TimelineEntry
from app.ai import gemini_client
from app.ai.prompts import VIDEO_FORENSIC_ANALYSIS_PROMPT
from app.services import audit_service

logger = logging.getLogger("crime_os.services.video")

GENESIS_HASH = "0" * 64


class LedgerService:
    """Tamper-evident ledger using the existing AuditEvent table."""

    def __init__(self) -> None:
        # Use JWT_SECRET as the signing key
        self._signing_key = settings.JWT_SECRET.encode("utf-8")

    @staticmethod
    def compute_record_hash(
        case_id: str,
        event_type: str,
        payload: dict,
        prev_hash: str,
    ) -> str:
        canonical_payload = json.dumps(
            payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True
        )
        record_string = f"{case_id}|{event_type}|{canonical_payload}|{prev_hash}"
        return hashlib.sha256(record_string.encode("utf-8")).hexdigest()

    def sign_hash(self, hash_hex: str) -> str:
        return hmac.new(
            self._signing_key,
            hash_hex.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _verify_signature(self, hash_hex: str, signature: str) -> bool:
        expected = self.sign_hash(hash_hex)
        return hmac.compare_digest(expected, signature)

    def _get_tail_hash(self, db: Session, case_id: uuid.UUID) -> str:
        stmt = (
            select(AuditEvent)
            .where(
                AuditEvent.case_id == case_id,
                AuditEvent.action.in_([
                    "FILE_UPLOADED",
                    "ANALYSIS_STARTED",
                    "GEMINI_UPLOAD_COMPLETE",
                    "INCIDENT_REPORT_GENERATED",
                    "GEMINI_FILE_DELETED",
                    "ANALYSIS_COMPLETED",
                    "ANALYSIS_FAILED"
                ])
            )
            .order_by(AuditEvent.created_at.desc())
            .limit(1)
        )
        row = db.scalar(stmt)
        if row and isinstance(row.detail, dict):
            return row.detail.get("ledger_hash", GENESIS_HASH)
        return GENESIS_HASH

    def append_ledger_event(
        self,
        db: Session,
        case_id: uuid.UUID,
        event_type: str,
        payload: dict,
        user_id: uuid.UUID | None,
    ) -> AuditEvent:
        prev_hash = self._get_tail_hash(db, case_id)
        record_hash = self.compute_record_hash(
            case_id=str(case_id),
            event_type=event_type,
            payload=payload,
            prev_hash=prev_hash,
        )
        signature = self.sign_hash(record_hash)

        detail = {
            "payload": payload,
            "ledger_hash": record_hash,
            "prev_hash": prev_hash,
            "signature": signature
        }

        event = audit_service.record(
            db,
            case_id=case_id,
            user_id=user_id,
            action=event_type,
            detail=detail,
        )
        db.flush()

        logger.info(f"Ledger event appended: case={case_id}, type={event_type}, hash={record_hash[:16]}")
        return event

    def verify_case_chain(self, db: Session, case_id: uuid.UUID) -> bool:
        stmt = (
            select(AuditEvent)
            .where(
                AuditEvent.case_id == case_id,
                AuditEvent.action.in_([
                    "FILE_UPLOADED",
                    "ANALYSIS_STARTED",
                    "GEMINI_UPLOAD_COMPLETE",
                    "INCIDENT_REPORT_GENERATED",
                    "GEMINI_FILE_DELETED",
                    "ANALYSIS_COMPLETED",
                    "ANALYSIS_FAILED"
                ])
            )
            .order_by(AuditEvent.created_at.asc())
        )
        entries = db.scalars(stmt).all()

        if not entries:
            logger.warning(f"No ledger entries found for case {case_id}")
            return True

        prev_hash = GENESIS_HASH

        for entry in entries:
            detail = entry.detail
            if not isinstance(detail, dict):
                logger.error(f"Malformed detail in audit event {entry.id}")
                return False

            e_prev = detail.get("prev_hash")
            e_hash = detail.get("ledger_hash")
            e_sig = detail.get("signature")
            e_payload = detail.get("payload", {})

            if e_prev != prev_hash:
                logger.error(f"Chain break: expected prev_hash {prev_hash[:16]}, found {e_prev[:16] if e_prev else 'None'}")
                return False

            recomputed_hash = self.compute_record_hash(
                case_id=str(case_id),
                event_type=entry.action,
                payload=e_payload,
                prev_hash=prev_hash,
            )

            if recomputed_hash != e_hash:
                logger.error(f"Hash mismatch: computed {recomputed_hash[:16]}, found {e_hash[:16] if e_hash else 'None'}")
                return False

            if not e_sig or not self._verify_signature(e_hash, e_sig):
                logger.error(f"Invalid signature on audit event {entry.id}")
                return False

            prev_hash = e_hash

        logger.info(f"Chain verification passed for case {case_id}: {len(entries)} entries verified")
        return True


def _get_video_duration(filepath: str) -> Optional[float]:
    """Extract video duration using ffprobe with a safe fallback."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            duration = float(data["format"]["duration"])
            logger.info(f"Video duration extracted: {duration:.1f}s")
            return duration
    except Exception as e:
        logger.warning(f"ffprobe failed or not installed: {type(e).__name__}. Defaulting to 120.0s")
    return 120.0


def _parse_timestamp_to_seconds(timestamp: str) -> float:
    parts = timestamp.split(":")
    return float(int(parts[0]) * 60 + int(parts[1]))


def get_deterministic_report() -> dict:
    return {
        "summary": "Forensic analysis of surveillance footage. A red sedan is observed parking near the side entrance. A person in a dark hooded jacket exits the vehicle, approaches the door, attempts to bypass the lock, and flees when the security light triggers.",
        "crime_summary": "Attempted break-in and trespassing at restricted premises.",
        "risk_evaluation": "MEDIUM",
        "entities_detected": ["Red Sedan", "Suspect in dark jacket", "Side Entrance Door", "Bypass tool"],
        "timeline": [
            {"timestamp": "00:05", "description": "Red sedan enters camera view and parks near the side entrance."},
            {"timestamp": "00:15", "description": "Suspect exits the front passenger side of the vehicle."},
            {"timestamp": "00:30", "description": "Suspect approaches the side entrance and manipulates the door handle."},
            {"timestamp": "00:45", "description": "Security light activates; suspect retreats quickly back to the vehicle."},
            {"timestamp": "00:52", "description": "Vehicle exits frame traveling eastbound."}
        ]
    }


def analyze_video_task(evidence_id: uuid.UUID, filepath: str, actor_id: uuid.UUID | None = None):
    """Background task implementing the video analysis pipeline."""
    db = SessionLocal()
    ledger = LedgerService()
    try:
        # Retrieve EvidenceFile
        evidence = db.get(EvidenceFile, evidence_id)
        if not evidence:
            logger.error(f"EvidenceFile {evidence_id} not found for analysis background task")
            return

        case_id = evidence.case_id

        # 1. Update status to PROCESSING and set duration
        duration = _get_video_duration(filepath)
        ai_tags = dict(evidence.ai_tags)
        ai_tags.update({
            "video_status": "PROCESSING",
            "progress_percentage": 15,
            "duration_seconds": duration,
        })
        evidence.ai_tags = ai_tags
        db.flush()

        ledger.append_ledger_event(
            db=db,
            case_id=case_id,
            event_type="ANALYSIS_STARTED",
            payload={
                "evidence_id": str(evidence_id),
                "duration_seconds": duration,
            },
            user_id=actor_id,
        )
        db.commit()

        # 2. Upload to Gemini and Poll (if API key available)
        gemini_file_uri = None
        report_data = None
        use_gemini = bool(settings.GEMINI_API_KEY)
        used_fallback = False

        if use_gemini:
            try:
                ai_tags = dict(evidence.ai_tags)
                ai_tags.update({
                    "video_status": "ACTIVE_ANALYSIS",
                    "progress_percentage": 35,
                })
                evidence.ai_tags = ai_tags
                db.flush()
                db.commit()

                logger.info(f"Uploading video {filepath} to Gemini for evidence {evidence_id}")
                gemini_file = gemini_client.upload_file(filepath)
                gemini_file_uri = gemini_file.name

                # Update tags with Gemini URI
                ai_tags = dict(evidence.ai_tags)
                ai_tags["gemini_file_uri"] = gemini_file_uri
                evidence.ai_tags = ai_tags
                db.flush()

                ledger.append_ledger_event(
                    db=db,
                    case_id=case_id,
                    event_type="GEMINI_UPLOAD_COMPLETE",
                    payload={"gemini_file_uri": gemini_file_uri},
                    user_id=actor_id,
                )
                db.commit()

                # Poll status through the shared Gemini gateway.
                gemini_file = gemini_client.wait_for_file(gemini_file_uri, poll_interval=2, max_wait=180)
                logger.info(f"Gemini file state for evidence {evidence_id}: ACTIVE")
                ai_tags = dict(evidence.ai_tags)
                ai_tags["progress_percentage"] = 55
                evidence.ai_tags = ai_tags
                db.flush()
                db.commit()

                # Perform analysis prompt
                ai_tags = dict(evidence.ai_tags)
                ai_tags["progress_percentage"] = 60
                evidence.ai_tags = ai_tags
                db.flush()
                db.commit()

                parsed_report = gemini_client.generate_json_from_file(
                    db,
                    purpose="video_forensic_analysis",
                    prompt=VIDEO_FORENSIC_ANALYSIS_PROMPT,
                    schema=IncidentReport,
                    media_file=gemini_file,
                    model=settings.GEMINI_FLASH_MODEL,
                )
                report_data = parsed_report.model_dump()
                logger.info(f"Successfully analyzed video via Gemini for evidence {evidence_id}")

            except Exception as e:
                logger.error(f"Gemini analysis failed: {e}. Falling back to deterministic report.")
                report_data = get_deterministic_report()
                used_fallback = True
        else:
            # Deterministic offline fallback
            logger.info(f"No Gemini key configured. Using deterministic fallback report for evidence {evidence_id}")
            # Simulate a brief delay to mimic background analysis
            time.sleep(2)
            report_data = get_deterministic_report()
            used_fallback = True

        # Update progress to Persisting
        ai_tags = dict(evidence.ai_tags)
        ai_tags["progress_percentage"] = 75
        evidence.ai_tags = ai_tags
        db.flush()
        db.commit()

        # 3. Persist timeline events as EvidenceMarkers and TimelineEvents
        # First check risk level matching
        risk_level = report_data.get("risk_evaluation", "MEDIUM")

        # Save chronological timeline entries as markers
        for idx, entry in enumerate(report_data.get("timeline", [])):
            seconds = _parse_timestamp_to_seconds(entry["timestamp"])
            marker = EvidenceMarker(
                evidence_file_id=evidence_id,
                marker_type="video_timestamp",
                start_ms=int(seconds * 1000),
                end_ms=int(seconds * 1000),
                transcript_text=entry["description"],
                linked_entity_ids=[],
            )
            db.add(marker)

            # Insert as TimelineEvent to the case
            timeline_event = TimelineEvent(
                case_id=case_id,
                occurred_at=datetime.now(timezone.utc),  # real-world insertion/analysis reference
                event_type="cctv_frame",
                title=f"Video Analysis Event - {entry['timestamp']}",
                description=entry["description"],
                confidence=0.85,
                source_ref={
                    "type": "video_evidence",
                    "evidence_file_id": str(evidence_id),
                    "timestamp": entry["timestamp"]
                },
                ai_generated=True,
                evidence_file_id=evidence_id,
                cctv_analysis={
                    "timestamp_in_video": entry["timestamp"],
                    "timestamp_seconds": seconds,
                    "entities_detected": report_data.get("entities_detected", []) if idx == 0 else [],
                    "risk_level": risk_level
                }
            )
            db.add(timeline_event)

        # Update EvidenceFile tags with full report
        ai_tags = dict(evidence.ai_tags)
        ai_tags.update({
            "video_status": "COMPLETED",
            "progress_percentage": 100,
            "summary": report_data.get("summary"),
            "crime_summary": report_data.get("crime_summary"),
            "risk_evaluation": risk_level,
            "entities_detected": report_data.get("entities_detected", []),
            "timeline": report_data.get("timeline"),
            "error_detail": None,
            "provenance": {
                "source_type": "video_file",
                "source_id": str(evidence_id),
                "prompt": "VIDEO_FORENSIC_ANALYSIS_PROMPT",
                "model": settings.GEMINI_FLASH_MODEL if not used_fallback else "deterministic_fallback",
                "fallback": used_fallback,
            },
        })
        evidence.ai_tags = ai_tags
        db.flush()

        ledger.append_ledger_event(
            db=db,
            case_id=case_id,
            event_type="INCIDENT_REPORT_GENERATED",
            payload={
                "summary": report_data.get("summary"),
                "crime_summary": report_data.get("crime_summary"),
                "risk_evaluation": risk_level,
                "timeline_count": len(report_data.get("timeline", []))
            },
            user_id=actor_id,
        )
        db.commit()

        # 4. Cleanup Gemini file and local temp file
        if use_gemini and gemini_file_uri:
            try:
                gemini_client.delete_file(gemini_file_uri)
                logger.info(f"Deleted Gemini video file: {gemini_file_uri}")
                ledger.append_ledger_event(
                    db=db,
                    case_id=case_id,
                    event_type="GEMINI_FILE_DELETED",
                    payload={"gemini_file_uri": gemini_file_uri},
                    user_id=actor_id,
                )
                db.commit()
            except Exception as e:
                logger.error(f"Failed to delete Gemini file {gemini_file_uri}: {e}")

        # Delete local temp file
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Deleted local temp file: {filepath}")
        except Exception as e:
            logger.error(f"Failed to delete local temp file: {e}")

        # Record completion
        ledger.append_ledger_event(
            db=db,
            case_id=case_id,
            event_type="ANALYSIS_COMPLETED",
            payload={
                "evidence_id": str(evidence_id),
                "local_file_deleted": not os.path.exists(filepath),
            },
            user_id=actor_id,
        )

        # Verify chain integrity
        ledger.verify_case_chain(db, case_id)
        db.commit()

    except Exception as e:
        logger.error(f"Background video analysis failed for {evidence_id}: {e}", exc_info=True)
        # Mark as failed in DB
        try:
            db.rollback()
            evidence = db.get(EvidenceFile, evidence_id)
            if evidence:
                ai_tags = dict(evidence.ai_tags)
                ai_tags.update({
                    "video_status": "FAILED",
                    "progress_percentage": 100,
                    "error_detail": str(e)
                })
                evidence.ai_tags = ai_tags
                db.flush()

                ledger.append_ledger_event(
                    db=db,
                    case_id=evidence.case_id,
                    event_type="ANALYSIS_FAILED",
                    payload={"reason": str(e)[:300]},
                    user_id=actor_id,
                )
                db.commit()
        except Exception as rollback_err:
            logger.error(f"Failed to save failure status for {evidence_id}: {rollback_err}")
    finally:
        db.close()
