# STAGE 1 — Database Models & Tamper-Evident Ledger

Precondition: Stage 0 complete, `docker compose up` healthy.

---

### CKPT-1.1 — SQLAlchemy Models & Alembic Migration
```
Implement backend/database/connection.py with an async SQLAlchemy engine (asyncpg driver) and session factory reading DATABASE_URL from config.py.

Implement backend/database/models.py with two SQLAlchemy models:

VideoCase:
- id (UUID, PK, server_default gen_random_uuid())
- filename (text)
- original_md5 (char(32)) — checksum of the uploaded file, computed before any processing
- duration_seconds (float, nullable until analysis completes)
- file_size_bytes (bigint)
- status (enum: UPLOADED, PROCESSING, ACTIVE_ANALYSIS, COMPLETED, FAILED)
- risk_evaluation (enum: LOW, MEDIUM, HIGH, nullable until completed)
- summary (text, nullable)
- final_ledger_hash (char(64), nullable) — set once the full ledger chain for this case is written
- gemini_file_uri (text, nullable) — reference to the uploaded file on Google's side, cleared after deletion
- created_at, updated_at (timestamptz)

ChronologicalLog:
- id (bigserial, PK)
- case_id (FK to VideoCase, indexed)
- timestamp_in_video (text, format MM:SS)
- timestamp_seconds (float) — parsed numeric seconds, used by the frontend for video seeking
- description (text)
- entities_detected (text[])
- risk_level (enum: LOW, MEDIUM, HIGH)
- sequence_order (integer) — explicit ordering since timeline entries must render in strict chronological sequence
- created_at (timestamptz)

Write the Alembic migration. Add appropriate indexes: VideoCase.status, ChronologicalLog.case_id + sequence_order composite.

Acceptance criteria:
- `alembic upgrade head` runs cleanly against the postgres container
- Test: inserting a VideoCase and multiple ChronologicalLog rows referencing it round-trips correctly, including array field entities_detected
- Test: deleting a VideoCase cascades to delete its ChronologicalLog rows (or is blocked — pick one explicitly and enforce it at the DB level, do not leave orphaned rows possible)
```

### CKPT-1.2 — Tamper-Evident Hash-Chained Ledger
```
Implement backend/utils/crypto.py with a LedgerService class implementing chain-of-custody hashing for video case records, satisfying BNS timeline/admissibility requirements:

- compute_record_hash(case_id, event_type, payload: dict, prev_hash: str) -> str: canonicalizes payload (sorted-key JSON), concatenates with case_id, event_type, and prev_hash, computes SHA-256.
- sign_hash(hash_hex: str) -> str: HMAC-signs the hash using LEDGER_SIGNING_KEY from config (note: flag in a code comment that this should be upgraded to a KMS/HSM-backed signer before production use with real evidentiary weight — do not silently treat this as court-ready).
- append_ledger_event(case_id, event_type: Literal["FILE_UPLOADED","ANALYSIS_STARTED","GEMINI_UPLOAD_COMPLETE","INCIDENT_REPORT_GENERATED","GEMINI_FILE_DELETED","ANALYSIS_COMPLETED","ANALYSIS_FAILED"], payload: dict) -> LedgerEntry: fetches the current tail hash for this case_id (genesis = 64 zeros), computes and signs the new hash, inserts into a new ledger_entries table (case_id, event_type, payload_hash, prev_hash, signature, created_at, payload_snapshot jsonb), and updates VideoCase.final_ledger_hash to the latest hash.
- verify_case_chain(case_id) -> bool: walks all ledger_entries for the case_id in created_at/id order, recomputes each hash and signature, returns False on any break — this is the function that "marks the evidence as legally invalid" if tampering is detected.

Add the ledger_entries table via a new Alembic migration. Add a Postgres trigger/rule blocking UPDATE and DELETE on ledger_entries, so no application code path can bypass the append-only guarantee.

Acceptance criteria:
- Test: appending 20 events across 2 different case_ids, verify_case_chain() returns True for both
- Test: directly mutating a payload_hash via raw SQL causes verify_case_chain() to return False afterward
- Test: raw SQL UPDATE or DELETE against ledger_entries is rejected by the database itself
- Test: VideoCase.final_ledger_hash matches the hash of the most recent ledger_entries row for that case after each append
```
