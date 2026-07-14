# Stage 3 · Checkpoint 2 — Pluggable Parsers (CDR / IP Log / Bank Statement)

## Objective
Implement a `Parser` interface with three concrete strategies (CDR, IP session log, bank statement), a dispatcher that selects the right one based on `legal_requests.template_type`, and the async worker that consumes the parse queue from Checkpoint 1, writing normalized rows into the three Postgres tables.

## Context
- Target tables: `cdr_records`, `ip_session_records`, `bank_transaction_records` (`ARCHITECTURE.md` §1.3).
- Source: uploaded CSV from Checkpoint 1, referenced by `raw_response_dumps` Mongo doc.
- `TRAE_SYSTEM_INSTRUCTIONS.md` §4 — no ORMs, hand-written SQL, stdlib `encoding/csv` preferred.

## Step-by-Step Instructions
1. Create `internal/analytics/parser.go`:
   - `type ParsedRow map[string]any`.
   - `type Parser interface { Parse(r io.Reader) (rows []ParsedRow, errs []ParseError) }`.
   - `func SelectParser(templateType string) (Parser, error)` — maps `CDR_REQUEST → CDRParser{}`, `IP_LOG_REQUEST/SUBSCRIBER_DETAILS_REQUEST → IPLogParser{}`, `BANK_STATEMENT_REQUEST → BankStatementParser{}`; returns `ErrNoParserForTemplateType` otherwise (e.g., `KYC_REQUEST`/`ACCOUNT_FREEZE_REQUEST` have no structured parser in this stage — document as future work, not a bug).
2. Create `internal/analytics/parser_cdr.go`:
   - `CDRParser` implements `Parser` using `encoding/csv`. Expect header row with flexible column-name matching (case-insensitive, tolerate `Caller`/`caller_number`/`A-Party` variants via a small alias map per field — this mirrors real-world telecom CDR export inconsistency).
   - Required fields: caller, callee, call_type, call_start (parse multiple date formats: `2006-01-02 15:04:05`, `02-01-2006 15:04`, RFC3339 — try each in order), duration_seconds, cell_tower_id (optional), imei/imsi (optional).
   - Per-row: on parse failure, append a `ParseError{Row, Reason, Raw}` and continue (never abort the whole file on one bad row).
3. Create `internal/analytics/parser_ip.go`:
   - `IPLogParser` — columns: ip_address (validate via `net.ParseIP`), session_start, session_end (optional), account_identifier, port_number (optional).
4. Create `internal/analytics/parser_bank.go`:
   - `BankStatementParser` — columns: txn_ref, txn_date, amount (parse as decimal string, reject non-numeric with a row error, never silently coerce to 0), txn_type (normalize `Cr`/`CREDIT`/`credit` → `CREDIT`, similarly for debit), counterparty_account (optional), counterparty_upi (optional, validate loosely against UPI shape from `internal/entity/patterns.go` — reuse, don't duplicate the regex), narration (optional, free text).
5. Create `internal/analytics/worker.go`:
   - `func RunParseWorker(ctx context.Context, q *ParseQueue, mongoRepo *MongoRepository, pgRepo *Repository, storageDir string)`:
     a. Pop job (`dump_id`, `legal_request_id`), set `parse_status = PARSING`.
     b. Load the legal request to get `template_type`; `SelectParser`.
     c. Open the file from disk (path recorded in the Mongo doc), run `Parse`.
     d. Batch-insert `ParsedRow`s into the correct Postgres table via `pgx.Batch` (one insert function per table in `internal/analytics/repository.go`), setting `raw_row_ref` to the Mongo `_id` for traceability.
     e. Update the Mongo doc: `parse_status = PARSED` (or `FAILED` if zero rows parsed successfully and errors exist for every row), `row_count_detected`, `row_count_parsed`, `parse_errors`, `parsed_at`.
     f. On success, transition `legal_requests.status = RESPONDED`, `responded_at = now()` (reuse `lers.Repository.UpdateStatus`).
6. Create `internal/analytics/repository.go` with `InsertCDRRecords`, `InsertIPSessionRecords`, `InsertBankTransactionRecords` — batched parameterized inserts.
7. Write `internal/analytics/parser_cdr_test.go`, `parser_ip_test.go`, `parser_bank_test.go` — each with a fixture CSV string covering: well-formed rows, a row with a bad date, a row with an out-of-range/garbage IP, a row with non-numeric amount — asserting correct rows parse and bad rows land in `errs` with an accurate `Row` index, and that one bad row never drops or corrupts a subsequent good row.

## Verification Checkpoint
```bash
cd backend && go test ./internal/analytics/... -v

cat <<'EOF' > /tmp/cdr_sample.csv
caller_number,callee_number,call_type,call_start,duration_seconds,cell_tower_id
9876543210,9123456780,VOICE,2026-06-01 10:15:00,120,TWR-441
9876543210,9123456781,SMS,not-a-date,0,TWR-441
EOF

curl -s -X POST http://localhost:8080/api/v1/legal-requests/<cdrRequestId>/responses -F "file=@/tmp/cdr_sample.csv" | jq
sleep 2
curl -s http://localhost:8080/api/v1/legal-requests/<cdrRequestId>/responses/<dumpId> | jq
# expect row_count_detected: 2, row_count_parsed: 1, parse_errors containing the bad-date row

psql "$POSTGRES_DSN" -c "SELECT * FROM cdr_records WHERE legal_request_id='<cdrRequestId>';"
# expect exactly 1 row, matching the good line

psql "$POSTGRES_DSN" -c "SELECT status, responded_at FROM legal_requests WHERE id='<cdrRequestId>';"
# expect status = RESPONDED
```

## Documentation Requirements
- `internal/analytics/doc.go`: update with the `Parser` interface contract and the "adding a new parser" checklist (implement interface → register in `SelectParser` → add fixture test).
- `backend/API.md`: no new endpoints this checkpoint (worker is internal), but note in `MONGO_SCHEMA_NOTES.md` that `parse_errors` array shape is now finalized per `ParseError` struct.
- Inline comment on each parser's column-alias map explaining why flexible header matching is necessary (real provider exports are inconsistent).
