# Shared Context (reference only)

This block is already embedded at the top of every numbered stage prompt.
Keep it here for reference or to paste manually if a stage file gets
truncated by your tool.

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

Before writing code in each stage, inspect the actual existing files
referenced (repository patterns, handler error envelope, frontend
type-casing convention, test runner) and match them exactly rather than
assuming. This module is being built in stages — only build what the
current stage asks for, but keep later stages in mind for naming
consistency.
```
