# Stage 2 · Checkpoint 3 — Dispatch Simulation Worker

## Objective
Build `internal/dispatch`: an async worker that simulates SMTP dispatch of an approved (`QUEUED`) legal request, transitions its status through the state machine, and logs every transition to `dispatch_events`.

## Context
- Depends on Checkpoint 2 (`legal_requests.status = QUEUED` reachable via approve endpoint).
- State machine: `QUEUED → SENT → ACKNOWLEDGED → (RESPONDED handled in Stage 3) | OVERDUE`.
- Endpoint: `POST /api/v1/legal-requests/{id}/dispatch`, `GET /api/v1/legal-requests/{id}/dispatch-events`, `GET /api/v1/cases/{caseId}/legal-requests?status=OVERDUE` — contracts in `ARCHITECTURE.md` §1.5.

## Step-by-Step Instructions
1. Create `internal/dispatch/queue.go`:
   - `type Job struct { LegalRequestID uuid.UUID }`.
   - `type Queue struct { ch chan Job }` with `NewQueue(bufferSize int) *Queue`, `Enqueue(job Job) error` (non-blocking with a `default: return ErrQueueFull` select), `Jobs() <-chan Job`.
   - This is an in-process channel queue for hackathon scope — add a comment noting Redis-backed (`asynq` or raw `redis` streams) as the production swap-in, but do NOT add the dependency now per zero-dependency policy unless explicitly requested in a later checkpoint.
2. Create `internal/dispatch/simulator.go`:
   - `func SimulateSMTPSend(ctx context.Context, req model.LegalRequest, provider model.ServiceProvider) (success bool, detail map[string]any, err error)` — for the hackathon demo, simulate with a deterministic-but-varied outcome (e.g., 90% success using a seeded PRNG so demo runs are reproducible with a fixed seed env var `DISPATCH_SIM_SEED`), producing a `detail` map like `{"smtp_response":"250 OK","to":provider.NodalOfficerEmail}` on success or `{"smtp_response":"550 mailbox unavailable"}` on simulated failure.
3. Create `internal/dispatch/worker.go`:
   - `func RunWorker(ctx context.Context, q *Queue, repo *lers.Repository, dispatchRepo *Repository, providerRepo *lers.Repository)` — a goroutine loop reading from `q.Jobs()`:
     a. Load the legal request; if `status != QUEUED`, skip and log a warning (defensive — should not happen if enqueue only happens from the approve/dispatch handler).
     b. Record `dispatch_events` row `QUEUED` (if not already recorded at enqueue time — decide one single source of truth and document it).
     c. Call `SimulateSMTPSend`; on success, update `legal_requests.status = SENT`, `dispatched_at = now()`, record `dispatch_events` row `SMTP_SENT`.
     d. On failure, record `dispatch_events` row `SMTP_FAILED`, leave status as `QUEUED` (retryable) — implement a simple retry cap (max 3 attempts tracked via a counter column or via counting prior `SMTP_FAILED` events for this request) after which status moves to `REJECTED_BY_PROVIDER` with a final failure event.
     e. After `SMTP_SENT`, simulate an acknowledgment after a short delay (`time.AfterFunc` or a second lighter-weight goroutine) transitioning to `ACKNOWLEDGED` with an `ACK_RECEIVED` event — this represents the provider's nodal officer confirming receipt.
4. Create `internal/dispatch/repository.go`:
   - `RecordEvent(ctx, legalRequestID uuid.UUID, eventType string, detail map[string]any) error`.
   - `ListEvents(ctx, legalRequestID uuid.UUID) ([]model.DispatchEvent, error)`.
5. Create `internal/dispatch/overdue.go`:
   - `func RunOverdueSweeper(ctx context.Context, repo *lers.Repository, interval time.Duration)` — a ticker goroutine that periodically runs `UPDATE legal_requests SET status='OVERDUE' WHERE status IN ('SENT','ACKNOWLEDGED') AND sla_due_at < now()`, and records an audit-log-worthy note (log via `slog`, and optionally a synthetic `dispatch_events` row `type: 'OVERDUE_MARKED'` — if you add this, add it to the `event_type` CHECK constraint via a new migration `0013_dispatch_events_add_overdue.sql`).
6. Create `internal/handler/dispatch.go`:
   - `DispatchLegalRequest` — validates `status == QUEUED`, enqueues the job, returns `202 {message, legal_request_id}`.
   - `ListDispatchEvents` — `200 {events}`.
   - `ListLegalRequestsByStatus` — supports `?status=OVERDUE` query filter, `200 {legal_requests}`.
7. Wire `RunWorker` and `RunOverdueSweeper` as background goroutines started from `cmd/server/main.go` after the router is set up, with the queue passed into the dispatch handler via dependency injection.

## Verification Checkpoint
```bash
cd backend && go test ./internal/dispatch/... -v

export DISPATCH_SIM_SEED=42
go run ./cmd/server &

curl -s -X POST http://localhost:8080/api/v1/legal-requests/<id>/dispatch | jq
# expect 202

sleep 2
curl -s http://localhost:8080/api/v1/legal-requests/<id>/dispatch-events | jq
# expect QUEUED -> SMTP_SENT -> ACK_RECEIVED sequence with timestamps

psql "$POSTGRES_DSN" -c "SELECT request_number, status FROM legal_requests WHERE id='<id>';"
# expect status = ACKNOWLEDGED

# overdue sweep manual test: fast-forward by directly setting sla_due_at in the past
psql "$POSTGRES_DSN" -c "UPDATE legal_requests SET sla_due_at = now() - interval '1 hour' WHERE id='<id>';"
# wait one sweeper interval, then:
curl -s "http://localhost:8080/api/v1/cases/<caseId>/legal-requests?status=OVERDUE" | jq
```

## Documentation Requirements
- `internal/dispatch/doc.go`: documents the full state machine as an ASCII diagram in the comment, and explicitly calls out the in-process-channel-vs-Redis tradeoff.
- `backend/API.md`: append the three new endpoints.
- Comment on `SimulateSMTPSend` clarifying this is a DEMO SIMULATION — no real email is sent — and where a real SMTP integration (e.g. `net/smtp` or a transactional email API) would be substituted.
