---
name: Postgres Migration Writer
description: Creates a new sequentially-numbered PostgreSQL migration file for this project, following the exact conventions in ARCHITECTURE.md and internal/db/migrate.go. Use whenever a checkpoint requires adding, altering, or seeding a table.
---

# Postgres Migration Writer

## Description
Every schema change in this project goes through `/backend/migrations/NNNN_description.sql`, applied by the hand-written runner in `internal/db/migrate.go` (no ORM, no third-party migration framework — see TRAE_SYSTEM_INSTRUCTIONS.md §4). This skill encodes the exact steps so migrations stay consistent across all 16 checkpoints instead of being reinvented each time.

## When to Use
- A checkpoint prompt says "create migration `NNNN_....sql`" or "add a column/table/index."
- You need to seed demo data (e.g. `service_providers`).
- You need to alter a CHECK constraint (e.g. adding a new `event_type` enum value).

## Instructions
1. **Determine the next sequence number.** List `/backend/migrations/*.sql`, sorted lexically. Take the highest existing prefix and increment by one, zero-padded to 4 digits (`0001`, `0002`, ... `0013`). Never reuse or renumber an existing file — migrations are forward-only and immutable once committed.
2. **Name the file** `NNNN_snake_case_description.sql` — the description should name the table or change, not the checkpoint (e.g. `0013_dispatch_events_add_overdue.sql`, not `stage2_checkpoint3_migration.sql`).
3. **Header comment.** Every migration file starts with a comment block:
   ```sql
   -- Migration: 0013_dispatch_events_add_overdue.sql
   -- Origin: ARCHITECTURE.md §1.3 / Stage 2 Checkpoint 3
   -- Purpose: <one sentence>
   ```
4. **Write DDL only** — no application logic, no seed-data mixed with schema-altering statements unless the file is explicitly a seed migration (name it `NNNN_seed_<table>.sql` in that case).
5. **Indexes**: any new column that will be filtered/joined on gets an index in the same migration, following the naming convention `idx_<table>_<column(s)>` or `uq_<table>_<column(s)>` for unique constraints.
6. **Never edit a previously-applied migration file.** If a mistake is discovered after the file has been run once (check `schema_migrations` table), write a new migration that corrects it (`ALTER TABLE ... `) — do not mutate history.
7. **Update `backend/migrations/SCHEMA_NOTES.md`**: append one paragraph explaining the new table/column's purpose and its relationship to neighboring tables. This is mandatory, not optional — every migration checkpoint in this project requires it.
8. **Verify**: restart the Go server (`go run ./cmd/server`) and confirm the log shows `applied migration NNNN_....sql` exactly once, then confirm idempotency by restarting again with no re-apply errors.

## Example
Input: "Add a `retry_count` column to `legal_requests` to support the dispatch worker's retry cap."

Output file `0013_legal_requests_retry_count.sql`:
```sql
-- Migration: 0013_legal_requests_retry_count.sql
-- Origin: Stage 2 Checkpoint 3 (dispatch retry cap)
-- Purpose: Track SMTP dispatch retry attempts per legal request.

ALTER TABLE legal_requests ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
CREATE INDEX idx_legal_requests_retry_count ON legal_requests(retry_count) WHERE retry_count > 0;
```
Plus a matching paragraph appended to `SCHEMA_NOTES.md`.
