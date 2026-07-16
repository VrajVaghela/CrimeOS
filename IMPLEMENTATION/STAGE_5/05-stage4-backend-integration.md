# Stage 4 of 6 — Backend Integration (Handlers, main.go, Tests)

Paste this whole file into your coding assistant. Assumes Stages 1–3 are
already merged (schema, models/repository, scanners/worker all exist).

```
You are implementing "OSINT & Breach Intelligence," a new module inside the
existing CrimeOS Digital Footprint codebase. Match existing conventions
exactly — do not introduce new frameworks, ORMs, or state management
libraries.

EXISTING ARCHITECTURE:
Backend: Go modular monolith, `chi` router, PostgreSQL via `pgx`, MongoDB
for raw response data. Handlers live in internal/handler, wrapped by
internal/audit middleware on mutating routes. The osint package
(models.go, repository.go, sherlock.go, holehe.go, breach.go, worker.go)
already exists from previous stages — inspect it before writing this
stage's code so signatures match exactly, especially:
  osint.EnqueueScanForEntity(ctx, repo, entityID, caseID, entityType, entityValue) error
  osint.RunWorker(ctx, repo, mongoDB, interval, concurrency)
  Repository.GetFullResult(ctx, entityID) (EntityScanResult, error)

Trigger workflow: PATCH /api/v1/entities/{entityId} already exists in
internal/handler and transitions digital_entities.status. On a transition
to CONFIRMED, it must now also enqueue an OSINT scan without blocking or
failing the HTTP response if enqueueing errors.

This module is being built in stages — only build what THIS stage asks
for.

============================================================
STAGE 4 OF 6: HANDLERS + MAIN.GO WIRING + GO TESTS
============================================================

--- MODIFY: backend/internal/handler/entity.go (or wherever the PATCH
    /api/v1/entities/{entityId} handler currently lives — locate it first) ---

After the existing entity status-update transaction commits successfully,
if the new status is CONFIRMED:
- Call osint.EnqueueScanForEntity with the entity's ID, case ID, type, and
  value (pull these from the already-updated entity record — do not
  re-query if the handler already has them in scope).
- If enqueueing returns an error, log it at error level but do NOT change
  the HTTP response — the PATCH itself already succeeded and must still
  return its existing success status code and body shape unchanged.
- Add a one-line comment marking this block as "// OSINT trigger point:
  enrichment enqueued asynchronously on entity confirmation".
- Do not alter the handler's behavior for REJECTED or MERGED transitions.
- Do not change the existing response JSON shape for this endpoint.

--- NEW FILE: backend/internal/handler/osint.go ---

Implement `GET /api/v1/cases/{caseId}/osint/{entityId}`:
- Parse and validate caseId and entityId as UUIDs; on parse failure return
  400 using the exact same JSON error envelope shape already used by other
  handlers in this package (inspect an existing handler, e.g. the entities
  or legal-requests handler, and copy its error-response helper/shape
  exactly — do not invent a new one).
- Call repository.GetFullResult(ctx, entityID).
- If the repository returns its "not found" sentinel/wrapped error (no
  scan exists yet for this entity — e.g. not yet confirmed, or enqueue
  hasn't been picked up by the worker), return 404 with the standard error
  envelope and a clear message such as "no OSINT scan found for entity".
- On any other repository error, return 500 with the standard error
  envelope; log the underlying error server-side.
- On success, return 200 with the EntityScanResult JSON body.
- Apply the same logging/recovery middleware already applied to other GET
  routes in this router group (this is a read-only route — it should NOT
  be wrapped with the audit middleware used for mutating routes, unless
  existing GET routes in this codebase already are; match whatever's
  standard for GETs).

--- MODIFY: backend/cmd/server/main.go ---

- Register the new route `GET /api/v1/cases/{caseId}/osint/{entityId}`
  under the existing /api/v1 router group, positioned near the other
  case-scoped routes (entities, legal-requests).
- Construct an osint.Repository using the existing shared pgx pool (match
  however other repositories are constructed in main.go).
- Read two new env vars using the exact same helper/pattern already used
  for existing worker intervals (e.g. however
  DISPATCH_POLL_INTERVAL_SECONDS or similar is currently read):
    - OSINT_POLL_INTERVAL_SECONDS (default 5)
    - OSINT_WORKER_CONCURRENCY (default 4)
- Start osint.RunWorker as an additional background goroutine alongside
  the existing dispatch worker, overdue sweeper, and parse worker, using
  the same context-cancellation-on-shutdown pattern already present for
  those three (the worker must stop cleanly when the server receives its
  shutdown signal).
- Do not change how the three existing workers are started.

--- NEW FILE: backend/internal/osint/sherlock_test.go ---

Table-driven test(s) for MockSherlockScanner:
- Same username scanned twice produces identical results (determinism).
- Different usernames generally produce different result sets (sanity
  check, not a strict requirement — assert on a few known inputs against
  their expected hash-derived outcome, or assert structural properties
  like "profile_url is non-empty for every found platform" and "follower
  count is non-negative" if hash-exact assertions are too brittle).
- Respects context cancellation (start a scan with an already-cancelled
  context and assert it returns promptly with an error, not a full scan).

--- NEW FILE: backend/internal/osint/breach_test.go ---

Table-driven tests for the severity-classification pure function from
breach.go, covering all four branches explicitly:
- Passwords + Financial Credentials -> CRITICAL
- Passwords + Government ID -> CRITICAL
- Passwords alone -> HIGH
- Phone Numbers only (no Passwords) -> MEDIUM
- Physical Address only (no Passwords) -> MEDIUM
- Emails only -> LOW
- Empty exposed_data_classes -> LOW

Requirements:
- Match whatever Go test runner/assertion library (stdlib testing vs
  testify, etc.) is already used elsewhere in this repo — inspect an
  existing _test.go file first and copy its style exactly.
- Output complete file contents for every new/modified file in this stage.
```
