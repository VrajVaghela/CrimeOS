# Stage 3 · Checkpoint 3 — Intelligence Flag Heuristics Engine

## Objective
Build `internal/analytics/heuristics.go`: post-parse analysis that scans newly normalized `cdr_records`/`ip_session_records`/`bank_transaction_records` for actionable patterns and writes `intelligence_flags` rows, exposed via a query endpoint.

## Context
- Table: `intelligence_flags` (`ARCHITECTURE.md` §1.3).
- Runs immediately after Checkpoint 2's `RunParseWorker` marks a request `RESPONDED`.
- Endpoint: `GET /api/v1/cases/{caseId}/intelligence-flags?severity=HIGH` — `ARCHITECTURE.md` §1.5.

## Step-by-Step Instructions
1. Create `internal/analytics/heuristics.go` with `func RunHeuristics(ctx context.Context, pgRepo *Repository, caseID, legalRequestID uuid.UUID, templateType string) ([]model.IntelligenceFlag, error)` dispatching to type-specific heuristic functions based on `templateType`.
2. Implement `heuristicVPNProxyIP(ctx, records []model.IPSessionRecord) []model.IntelligenceFlag`:
   - Maintain a small hardcoded `knownVPNRanges []net.IPNet` (a handful of illustrative CIDR blocks commented as "demo dataset — replace with a real threat-intel feed/IP reputation API in production").
   - For each IP session record whose IP falls in a known range, emit a flag `flag_type: VPN_PROXY_IP`, `severity: HIGH`, summary naming the IP and matched range.
3. Implement `heuristicRepeatedCounterparty(ctx, records []model.BankTransactionRecord) []model.IntelligenceFlag`:
   - Group transactions by `counterparty_upi` (and separately by `counterparty_account`); any counterparty appearing in `>= 3` transactions within the parsed batch gets a `flag_type: REPEATED_COUNTERPARTY`, `severity: MEDIUM`, summary listing count and total amount moved.
4. Implement `heuristicTowerClustering(ctx, records []model.CDRRecord) []model.IntelligenceFlag`:
   - Group by `cell_tower_id`; if a single tower accounts for `>= 60%` of all calls in the batch, flag `flag_type: TOWER_LOCATION_CLUSTER`, `severity: LOW`, summary noting probable base-of-operations inference (explicitly caveat in the summary text that this is a probabilistic lead, not a legal conclusion).
5. Implement `heuristicHighValueTransaction(ctx, records []model.BankTransactionRecord) []model.IntelligenceFlag`:
   - Any single transaction `>= ₹200000` (configurable via `HIGH_VALUE_TXN_THRESHOLD` env var) gets `flag_type: HIGH_VALUE_TRANSACTION`, `severity: HIGH`.
6. Create `internal/analytics/flag_repository.go`:
   - `BulkInsertFlags(ctx, flags []model.IntelligenceFlag) error`.
   - `ListByCase(ctx, caseID uuid.UUID, severity *string) ([]model.IntelligenceFlag, error)`.
7. Wire `RunHeuristics` as the final step inside `RunParseWorker` (Checkpoint 2, step 5.f) — call it right after marking `legal_requests.status = RESPONDED`, persist the returned flags via `BulkInsertFlags`.
8. Create `internal/handler/intelligence_flag.go` with `ListIntelligenceFlags` — `200 {flags}`, filterable by `?severity=`.
9. Write `internal/analytics/heuristics_test.go` — fixture-based tests for each of the four heuristics with clearly-crafted trigger and non-trigger cases (e.g., exactly 2 repeated counterparty transactions must NOT flag, exactly 3 must flag — boundary-test the thresholds precisely).

## Verification Checkpoint
```bash
cd backend && go test ./internal/analytics/... -run TestHeuristic -v

# re-upload the earlier bank statement fixture, extended to include 3+ txns to the same UPI:
curl -s -X POST http://localhost:8080/api/v1/legal-requests/<bankRequestId>/responses -F "file=@/tmp/bank_sample.csv" | jq
sleep 2
curl -s "http://localhost:8080/api/v1/cases/<caseId>/intelligence-flags?severity=MEDIUM" | jq
# expect a REPEATED_COUNTERPARTY flag referencing the correct UPI id and transaction count
```

## Documentation Requirements
- `internal/analytics/doc.go`: append a section listing all implemented heuristics, their trigger thresholds, and explicitly note which are demo-simplified vs. production-viable as-is.
- `backend/API.md`: append the intelligence-flags endpoint.
- Comment above `knownVPNRanges` and `HIGH_VALUE_TXN_THRESHOLD` making clear these are illustrative/configurable, not investigative fact — flags are leads for officer review, never automated conclusions.
