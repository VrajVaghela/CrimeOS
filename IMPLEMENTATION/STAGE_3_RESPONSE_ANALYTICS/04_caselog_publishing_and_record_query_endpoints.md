# Stage 3 · Checkpoint 4 — Case Log Publishing & Normalized Record Query Endpoints

## Objective
Build `internal/caselog` to publish structured intel events to the shared Crime OS case timeline, and expose paginated query endpoints for the three normalized record tables (for the Response Analytics dashboard in Stage 4).

## Context
- Depends on Stage 3 Checkpoints 2 and 3.
- This is the module's integration seam with the rest of Crime OS AI — treat the publish contract as a stable interface even though the "core" consumer is out of this module's scope.
- Endpoints: `GET /api/v1/legal-requests/{id}/cdr-records`, and equivalents for ip-session and bank-transaction records — extend the pattern shown for CDR in `ARCHITECTURE.md` §1.5.

## Step-by-Step Instructions
1. Create `internal/caselog/event.go`:
   - `type IntelEvent struct { CaseID uuid.UUID; Source string; Summary string; Severity string; LinkedEntityIDs []uuid.UUID; OccurredAt time.Time }`.
2. Create `internal/caselog/publisher.go`:
   - `type Publisher interface { Publish(ctx context.Context, event IntelEvent) error }`.
   - `type PostgresPublisher struct{...}` implementing `Publisher` by writing to a shared `case_timeline_events` table if it exists in the core schema — for hackathon integration scope, assume it does NOT exist yet and instead write to a local module-owned table `caselog_outbox` (`ARCHITECTURE.md`-style: `id, case_id, source, summary, severity, linked_entity_ids, occurred_at, published`) as an outbox pattern; add migration `0014_caselog_outbox.sql`.
   - Document clearly: in a full integration, a background relay would drain `caselog_outbox` into the core platform's real event bus/table — that relay is explicitly OUT of scope for this module and flagged as an integration TODO.
3. Wire `caselog.Publisher.Publish` to be called automatically whenever `internal/analytics/heuristics.go` (Checkpoint 3) creates a `HIGH` or `CRITICAL` severity flag — every such flag becomes an `IntelEvent`.
4. Create `internal/analytics/query_handlers.go`:
   - `ListCDRRecords`, `ListIPSessionRecords`, `ListBankTransactionRecords` — each accepts `?page=&limit=` (default `limit=50`, cap at `200`), returns `200 {records, total}` using `COUNT(*) OVER()` window function in one query rather than two round trips.
5. Add all three routes to the router.
6. Write `internal/caselog/publisher_test.go` verifying an insert lands correctly in `caselog_outbox`, and `internal/analytics/query_handlers_test.go` verifying pagination math (`total`, correct row count per page, stable ordering by `created_at DESC`).

## Verification Checkpoint
```bash
cd backend && go test ./internal/caselog/... ./internal/analytics/... -v

curl -s "http://localhost:8080/api/v1/legal-requests/<id>/cdr-records?page=1&limit=10" | jq
curl -s "http://localhost:8080/api/v1/legal-requests/<id>/ip-session-records?page=1&limit=10" | jq
curl -s "http://localhost:8080/api/v1/legal-requests/<id>/bank-transaction-records?page=1&limit=10" | jq

psql "$POSTGRES_DSN" -c "SELECT source, severity, summary FROM caselog_outbox ORDER BY occurred_at DESC LIMIT 5;"
# expect the HIGH-severity flags from Checkpoint 3's demo run reflected here
```

## Documentation Requirements
- `internal/caselog/doc.go`: explains the outbox pattern, what "published" means in this module's scope, and the explicit TODO for the real cross-module relay.
- `backend/API.md`: append the three record-listing endpoints.
- `backend/migrations/SCHEMA_NOTES.md`: document `caselog_outbox` and its intended lifecycle.
