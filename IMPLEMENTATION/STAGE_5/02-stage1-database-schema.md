# Stage 1 of 6 — Database Schema

Paste this whole file into your coding assistant.

```
You are implementing "OSINT & Breach Intelligence," a new module inside the
existing CrimeOS Digital Footprint codebase. Match existing conventions
exactly — do not introduce new frameworks, ORMs, or state management
libraries.

EXISTING ARCHITECTURE:
Backend: Go modular monolith, `chi` router, PostgreSQL via `pgx` (raw SQL,
no ORM), MongoDB for raw/unstructured response data, background workers
started from `backend/cmd/server/main.go` following the pattern used by
`dispatch.RunWorker` and `analytics.RunParseWorker`. Mutating routes are
wrapped by `internal/audit` middleware. Handlers live in `internal/handler`,
domain logic in per-feature packages (`internal/entity`, `internal/lers`,
`internal/dispatch`, `internal/analytics`).

Frontend: React 19 + TypeScript + Vite, Tailwind CSS. Typed API wrappers in
`src/api/`, domain types in `src/types/`, reusable components in
`src/components/`, page-level views matching the existing
`/cases/:caseId/...` route pattern. State is local/context based — no
Redux/Zustand.

Trigger workflow: `PATCH /api/v1/entities/{entityId}` already exists and
transitions a `digital_entities` row to CONFIRMED/REJECTED/MERGED. On
CONFIRMED, an OSINT scan job must be enqueued asynchronously without
blocking the PATCH response, using the enqueue-then-poll pattern already
used for dispatch/parse jobs.

Module scope: simulated Sherlock-style username enumeration, simulated
Holehe-style email-registration checks, simulated breach-database lookups
(HaveIBeenPwned-style). All lookups are SIMULATED — deterministic mock data
generated in-process, no real third-party calls, but structured behind
clean interfaces so a real provider can be swapped in later.

Before writing code, inspect the actual existing files referenced above
(repository patterns, migration numbering/format) and match them exactly
rather than assuming. This module is being built in stages — only build
what THIS stage asks for.

============================================================
STAGE 1 OF 6: DATABASE SCHEMA ONLY
============================================================

Write a single forward-only PostgreSQL migration file at
backend/internal/db/migrations/NNNN_osint_schema.sql — first inspect the
existing migrations directory and use the next sequential number and
whatever naming/file-pair convention (e.g. separate .up/.down files, or a
single file) is already established there. Match it exactly.

Before creating any new trigger function for `updated_at` columns, check
whether existing migrations already define one (e.g. a shared
`set_updated_at()` trigger function) and reuse it instead of duplicating.

Create three tables:

1. `osint_scans`
   - id UUID PRIMARY KEY (match existing default, e.g. gen_random_uuid())
   - case_id UUID NOT NULL REFERENCES cases(id)
   - entity_id UUID NOT NULL REFERENCES digital_entities(id)
   - entity_type TEXT NOT NULL  -- mirrors digital_entities.type
   - entity_value TEXT NOT NULL  -- the confirmed value, e.g. username/email/phone
   - status TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')) DEFAULT 'PENDING'
   - started_at TIMESTAMPTZ NULL
   - completed_at TIMESTAMPTZ NULL
   - error_message TEXT NULL
   - created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   - updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   - Index on (entity_id)
   - Index on (case_id, status)

2. `social_profiles`
   - id UUID PRIMARY KEY
   - scan_id UUID NOT NULL REFERENCES osint_scans(id) ON DELETE CASCADE
   - platform TEXT NOT NULL  -- e.g. 'Instagram', 'GitHub', 'Twitter/X', 'Reddit', 'TikTok'
   - username TEXT NOT NULL
   - profile_url TEXT NOT NULL
   - profile_picture_url TEXT NULL
   - bio TEXT NULL
   - follower_count INTEGER NULL
   - is_verified BOOLEAN NOT NULL DEFAULT false
   - exists_confidence TEXT NOT NULL CHECK (exists_confidence IN ('CONFIRMED','LIKELY','UNCERTAIN')) DEFAULT 'LIKELY'
   - discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
   - Index on (scan_id)
   - Index on (platform)

3. `data_breaches`
   - id UUID PRIMARY KEY
   - scan_id UUID NOT NULL REFERENCES osint_scans(id) ON DELETE CASCADE
   - breach_name TEXT NOT NULL
   - breach_domain TEXT NULL
   - leak_date DATE NULL
   - exposed_data_classes TEXT[] NOT NULL  -- e.g. {'Passwords','Emails','Phone Numbers'}
   - record_count BIGINT NULL
   - severity TEXT NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW'))
   - source_note TEXT NULL
   - discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
   - Index on (scan_id)
   - Index on (severity)

Requirements:
- Use the same column-naming and constraint style already visible in other
  migrations in this repo (snake_case, explicit CHECK constraints, explicit
  index names following whatever prefix convention is already used, e.g.
  `idx_<table>_<columns>`).
- Attach `updated_at` auto-update behavior to `osint_scans` only (the other
  two tables are insert-only/append-only, matching how `dispatch_events` is
  treated elsewhere in this schema).
- Do not modify any existing table.
- Add a short comment block at the top of the file explaining the purpose
  of the migration, consistent with comment style in existing migration
  files if any exists.
- Output the complete file content, ready to drop in.
```
