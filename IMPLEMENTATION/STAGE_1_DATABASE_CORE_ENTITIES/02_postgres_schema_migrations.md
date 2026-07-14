# Stage 1 · Checkpoint 2 — PostgreSQL Schema Migrations

## Objective
Materialize the full PostgreSQL schema from `ARCHITECTURE.md` §1.3 as sequentially numbered, forward-only SQL migration files, plus a minimal Go migration runner (no external migration framework — stdlib only, per zero-dependency policy).

## Context
- Full DDL source of truth: `ARCHITECTURE.md` §1.3.
- Depends on Checkpoint 1 (`internal/db/postgres.go`) being complete.

## Step-by-Step Instructions
1. Create `/backend/migrations/` with these files, each containing ONLY the DDL for its named table(s), copied exactly from `ARCHITECTURE.md` §1.3:
   - `0001_extensions.sql` — the `pgcrypto` extension statement.
   - `0002_digital_entities.sql`
   - `0003_service_providers.sql`
   - `0004_legal_requests.sql`
   - `0005_dispatch_events.sql`
   - `0006_cdr_records.sql`
   - `0007_ip_session_records.sql`
   - `0008_bank_transaction_records.sql`
   - `0009_intelligence_flags.sql`
   - `0010_audit_log.sql`
2. Create `/backend/migrations/0011_audit_log_permissions.sql` that revokes `UPDATE, DELETE` on `audit_log` from the application's Postgres role (create the role grant statement using a placeholder role name `crimeos_app`, e.g. `REVOKE UPDATE, DELETE ON audit_log FROM crimeos_app;`).
3. Create `internal/db/migrate.go`:
   - Export `func RunMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error`.
   - Create a `schema_migrations` bookkeeping table (`version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ`) if not exists.
   - Read `*.sql` files from `dir` sorted lexically, skip any whose filename prefix already exists in `schema_migrations`, execute the rest inside a transaction per file, and record the version on success.
   - On any failure, roll back that file's transaction and return an error identifying the failing filename — do not apply partial files.
4. Wire `RunMigrations` into `cmd/server/main.go` immediately after the Postgres pool is created, before the router starts listening. Fail fast (log + `os.Exit(1)`) if migrations fail.
5. Create `backend/migrations/SCHEMA_NOTES.md` with one paragraph per table explaining its purpose and its foreign-key relationships, per `TRAE_SYSTEM_INSTRUCTIONS.md` §9.

## Verification Checkpoint
```bash
cd backend && go run ./cmd/server
# server log should show: "applied migration 0001_extensions.sql" ... through 0011

psql "$POSTGRES_DSN" -c "\dt"
# expect all 10 tables + schema_migrations listed

psql "$POSTGRES_DSN" -c "\d digital_entities"
# expect the unique index uq_entity_case_norm and all listed indexes present

# idempotency check — restart the server, confirm no duplicate-apply errors:
cd backend && go run ./cmd/server
```

## Documentation Requirements
- `backend/migrations/SCHEMA_NOTES.md` fully populated (one paragraph per table, as specified above).
- `internal/db/doc.go` updated to mention migration ownership lives in `migrate.go`.
- Comment at the top of each `.sql` file stating which checkpoint/architecture section it originates from.
