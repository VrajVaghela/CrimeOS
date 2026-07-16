"""
Crypto Utilities — Tamper-Evident Hash-Chained Ledger Service
==============================================================
Implements chain-of-custody hashing for video case records, satisfying
BNS timeline/admissibility requirements.

Architecture:
    Each case maintains an independent hash chain. Every event appended to
    the ledger includes:
        1. A SHA-256 hash of the canonicalized payload + metadata
        2. A link to the previous hash (genesis = 64 zeros)
        3. An HMAC signature of the hash using LEDGER_SIGNING_KEY

    The chain can be independently verified by recomputing all hashes and
    signatures in order. Any modification to existing entries breaks the chain.

Security Notes:
    ⚠️  PRODUCTION WARNING: The current implementation uses HMAC-SHA256 with a
    symmetric key loaded from environment variables. Before production use with
    real evidentiary weight, this MUST be upgraded to a KMS/HSM-backed asymmetric
    signing scheme (e.g., AWS KMS, Azure Key Vault, or an on-premise HSM) to
    provide non-repudiation guarantees suitable for court admissibility.
    Do NOT silently treat this implementation as court-ready.

Usage:
    from utils.crypto import LedgerService

    ledger = LedgerService()
    async with get_db_session() as session:
        entry = await ledger.append_ledger_event(
            session=session,
            case_id="uuid-here",
            event_type="FILE_UPLOADED",
            payload={"filename": "evidence.mp4", "md5": "abc123..."},
        )
        is_valid = await ledger.verify_case_chain(session, case_id="uuid-here")
"""

import hashlib
import hmac
import json
import logging
from typing import Literal, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database.models import LedgerEntry, LedgerEventType, VideoCase

logger = logging.getLogger("video-incident-analyzer.ledger")

# Genesis hash: the "previous hash" for the first entry in any case's chain
GENESIS_HASH = "0" * 64


class LedgerService:
    """Tamper-evident hash-chained ledger for chain-of-custody tracking.

    Provides methods to:
        - Compute deterministic record hashes from event payloads
        - HMAC-sign hashes using the configured signing key
        - Append new events to the chain with automatic linking
        - Verify the integrity of the entire chain for a given case

    All methods that interact with the database expect an active AsyncSession
    to be passed in, allowing the caller to manage transaction boundaries.
    """

    def __init__(self) -> None:
        """Initialize the ledger service with the signing key from config.

        Raises:
            pydantic.ValidationError: If LEDGER_SIGNING_KEY is not configured.
        """
        settings = get_settings()
        self._signing_key = settings.LEDGER_SIGNING_KEY.encode("utf-8")

    @staticmethod
    def compute_record_hash(
        case_id: str,
        event_type: str,
        payload: dict,
        prev_hash: str,
    ) -> str:
        """Compute the SHA-256 hash of a ledger record.

        The payload is canonicalized (sorted-key JSON with no whitespace)
        before hashing to ensure deterministic results regardless of
        insertion order of dictionary keys.

        Args:
            case_id: UUID of the video case.
            event_type: Type of the ledger event (e.g., "FILE_UPLOADED").
            payload: Event payload dictionary to be hashed.
            prev_hash: Hash of the previous entry in the chain.

        Returns:
            str: 64-character lowercase hexadecimal SHA-256 hash string.

        Example:
            >>> LedgerService.compute_record_hash(
            ...     "abc-123", "FILE_UPLOADED",
            ...     {"filename": "test.mp4"}, "0" * 64
            ... )
            'e3b0c44298fc...'
        """
        # Canonicalize payload: sorted keys, no whitespace, ensure_ascii
        canonical_payload = json.dumps(
            payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True
        )

        # Concatenate all fields in a deterministic order
        record_string = f"{case_id}|{event_type}|{canonical_payload}|{prev_hash}"

        return hashlib.sha256(record_string.encode("utf-8")).hexdigest()

    def sign_hash(self, hash_hex: str) -> str:
        """HMAC-sign a hash using the configured LEDGER_SIGNING_KEY.

        ⚠️  PRODUCTION WARNING: This uses HMAC-SHA256 with a symmetric key.
        For real evidentiary weight, upgrade to a KMS/HSM-backed asymmetric
        signer (e.g., RSA-PSS or ECDSA via AWS KMS / Azure Key Vault).
        Do NOT treat this as court-ready without that upgrade.

        Args:
            hash_hex: The 64-character hexadecimal hash string to sign.

        Returns:
            str: HMAC-SHA256 signature as a hexadecimal string.
        """
        return hmac.new(
            self._signing_key,
            hash_hex.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _verify_signature(self, hash_hex: str, signature: str) -> bool:
        """Verify an HMAC signature against a hash.

        Uses constant-time comparison to prevent timing attacks.

        Args:
            hash_hex: The original hash string that was signed.
            signature: The HMAC signature to verify.

        Returns:
            bool: True if the signature is valid, False otherwise.
        """
        expected = self.sign_hash(hash_hex)
        return hmac.compare_digest(expected, signature)

    async def _get_tail_hash(
        self, session: AsyncSession, case_id: str
    ) -> str:
        """Retrieve the most recent hash in the chain for a case.

        Args:
            session: Active async database session.
            case_id: UUID of the video case.

        Returns:
            str: The hash of the most recent entry, or GENESIS_HASH (64 zeros)
                 if no entries exist for this case yet.
        """
        result = await session.execute(
            select(LedgerEntry.payload_hash)
            .where(LedgerEntry.case_id == case_id)
            .order_by(LedgerEntry.id.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row if row is not None else GENESIS_HASH

    async def append_ledger_event(
        self,
        session: AsyncSession,
        case_id: str,
        event_type: Literal[
            "FILE_UPLOADED",
            "ANALYSIS_STARTED",
            "GEMINI_UPLOAD_COMPLETE",
            "INCIDENT_REPORT_GENERATED",
            "GEMINI_FILE_DELETED",
            "ANALYSIS_COMPLETED",
            "ANALYSIS_FAILED",
        ],
        payload: dict,
    ) -> LedgerEntry:
        """Append a new event to the tamper-evident ledger chain.

        Performs the following atomically within the provided session:
            1. Fetches the current tail hash for this case (genesis = 64 zeros)
            2. Computes the SHA-256 hash of the new record
            3. HMAC-signs the hash
            4. Inserts the new LedgerEntry row
            5. Updates VideoCase.final_ledger_hash to the new hash

        Args:
            session: Active async database session (caller manages commit).
            case_id: UUID of the video case.
            event_type: One of the defined ledger event types.
            payload: Event-specific data to record (stored as JSONB snapshot).

        Returns:
            LedgerEntry: The newly created and persisted ledger entry.

        Raises:
            sqlalchemy.exc.IntegrityError: If case_id doesn't exist.
        """
        # Sanitize payload — never store sensitive keys
        sanitized_payload = self._sanitize_payload(payload)

        # Get the previous hash in the chain
        prev_hash = await self._get_tail_hash(session, case_id)

        # Compute the new record hash
        record_hash = self.compute_record_hash(
            case_id=case_id,
            event_type=event_type,
            payload=sanitized_payload,
            prev_hash=prev_hash,
        )

        # Sign the hash
        signature = self.sign_hash(record_hash)

        # Create the ledger entry
        entry = LedgerEntry(
            case_id=case_id,
            event_type=LedgerEventType(event_type),
            payload_hash=record_hash,
            prev_hash=prev_hash,
            signature=signature,
            payload_snapshot=sanitized_payload,
        )
        session.add(entry)

        # Update the case's final ledger hash
        await session.execute(
            update(VideoCase)
            .where(VideoCase.id == case_id)
            .values(final_ledger_hash=record_hash)
        )

        # Flush to assign the entry ID without committing
        await session.flush()

        logger.info(
            f"Ledger event appended: case={case_id}, type={event_type}, "
            f"hash={record_hash[:16]}..."
        )

        return entry

    async def verify_case_chain(
        self, session: AsyncSession, case_id: str
    ) -> bool:
        """Verify the integrity of the entire ledger chain for a case.

        Walks all ledger entries in insertion order, recomputes each hash
        and signature, and verifies the chain linkage. Returns False on
        any break — this marks the evidence as legally invalid if
        tampering is detected.

        Args:
            session: Active async database session.
            case_id: UUID of the video case to verify.

        Returns:
            bool: True if the entire chain is valid (all hashes and signatures
                  match, and all prev_hash links are correct). False if any
                  entry has been tampered with.
        """
        # Fetch all entries in creation order
        result = await session.execute(
            select(LedgerEntry)
            .where(LedgerEntry.case_id == case_id)
            .order_by(LedgerEntry.id.asc())
        )
        entries = result.scalars().all()

        if not entries:
            logger.warning(f"No ledger entries found for case {case_id}")
            return True  # No entries = no chain to break

        prev_hash = GENESIS_HASH

        for entry in entries:
            # 1. Verify the prev_hash link
            if entry.prev_hash != prev_hash:
                logger.error(
                    f"Chain break at entry {entry.id}: expected prev_hash "
                    f"{prev_hash[:16]}..., found {entry.prev_hash[:16]}..."
                )
                return False

            # 2. Recompute the record hash from stored data
            recomputed_hash = self.compute_record_hash(
                case_id=str(entry.case_id),
                event_type=entry.event_type.value,
                payload=entry.payload_snapshot or {},
                prev_hash=entry.prev_hash,
            )

            if recomputed_hash != entry.payload_hash:
                logger.error(
                    f"Hash mismatch at entry {entry.id}: expected "
                    f"{recomputed_hash[:16]}..., found {entry.payload_hash[:16]}..."
                )
                return False

            # 3. Verify the HMAC signature
            if not self._verify_signature(entry.payload_hash, entry.signature):
                logger.error(
                    f"Invalid signature at entry {entry.id} for case {case_id}"
                )
                return False

            # Advance the chain
            prev_hash = entry.payload_hash

        # 4. Verify final_ledger_hash on the VideoCase matches the last entry
        case_result = await session.execute(
            select(VideoCase.final_ledger_hash)
            .where(VideoCase.id == case_id)
        )
        case_hash = case_result.scalar_one_or_none()

        if case_hash != entries[-1].payload_hash:
            logger.error(
                f"VideoCase.final_ledger_hash mismatch for case {case_id}: "
                f"expected {entries[-1].payload_hash[:16]}..., "
                f"found {case_hash[:16] if case_hash else 'None'}..."
            )
            return False

        logger.info(
            f"Chain verification passed for case {case_id}: "
            f"{len(entries)} entries verified"
        )
        return True

    @staticmethod
    def _sanitize_payload(payload: dict) -> dict:
        """Remove sensitive information from payload before ledger storage.

        Ensures that API keys, signing keys, and other sensitive values
        are never persisted in the ledger's payload_snapshot, even if
        accidentally included by caller code.

        Args:
            payload: The raw event payload dictionary.

        Returns:
            dict: Sanitized copy of the payload with sensitive keys removed.
        """
        sensitive_keys = {
            "api_key", "apikey", "api_secret", "secret_key", "signing_key",
            "password", "token", "gemini_api_key", "GEMINI_API_KEY",
            "LEDGER_SIGNING_KEY", "ledger_signing_key",
        }
        return {
            k: v for k, v in payload.items()
            if k.lower() not in {s.lower() for s in sensitive_keys}
        }
