# Stage 1 · Checkpoint 3 — Entity Extraction Engine

## Objective
Build `internal/entity`: a pipeline that takes raw complaint text and extracts IPs, emails, phone numbers, UPI IDs, and social handles with confidence scores and source-text provenance, then persists them to `digital_entities`.

## Context
- Table target: `digital_entities` (Checkpoint 2).
- API target this feeds: `POST /api/v1/cases/{caseId}/entities/extract` (built in Checkpoint 4).
- `ARCHITECTURE.md` §1.2 step 2 describes extraction behavior and provenance requirement.

## Step-by-Step Instructions
1. Create `internal/entity/patterns.go` with compiled `regexp.Regexp` package-level vars:
   - `ipv4Pattern` — standard dotted-quad IPv4, with a validation function rejecting octets > 255 (regex alone over-matches; add a Go-level bounds check `isValidIPv4Octets`).
   - `emailPattern` — RFC-5322-lite: `[\w.+-]+@[\w-]+\.[\w.-]+`.
   - `phonePattern` — Indian mobile pattern supporting `+91`, `91`, or bare 10-digit starting with 6-9, plus a generic international fallback `\+?[1-9]\d{7,14}`.
   - `upiPattern` — `[\w.\-]{2,256}@[a-zA-Z]{2,64}` matching known PSP handle suffixes (`@okhdfcbank`, `@ybl`, `@paytm`, `@upi`, etc.) — maintain an allowlist slice `knownUPISuffixes` and require the domain part to match one of them, to disambiguate from `emailPattern`.
   - `socialHandlePattern` — `@[A-Za-z0-9_.]{2,30}` for handles, plus explicit URL patterns for `instagram.com/`, `twitter.com/`, `x.com/`, `facebook.com/`, `t.me/`.
2. Create `internal/entity/extractor.go`:
   - Define `type Extracted struct { EntityType, RawValue, NormalizedValue string; Offset [2]int; Confidence float64 }`.
   - Export `func Extract(sourceText string) []Extracted` that runs each pattern, and for each match:
     - Computes byte offsets via `regexp.FindAllStringIndex`.
     - Normalizes: lowercase for email/UPI/social; E.164-ish digit-only normalization for phone; as-is for IP.
     - Assigns confidence: `1.0` for unambiguous patterns (IP, email), `0.85` for UPI (suffix-allowlist matched), `0.7` for social handles (bare `@handle` is inherently ambiguous with email/UPI — run social pattern LAST and skip any span already claimed by email/UPI matches to avoid double-classification).
   - Implement span-conflict resolution: sort all matches by start offset; when two matches overlap, keep the one from the higher-priority extractor order `IP > EMAIL > UPI > PHONE > SOCIAL`.
3. Create `internal/entity/normalize.go` with pure functions `NormalizePhone`, `NormalizeEmail`, `NormalizeUPI` used by `extractor.go`.
4. Create `internal/entity/repository.go`:
   - `func (r *Repository) BulkInsert(ctx context.Context, caseID uuid.UUID, complaintRefID *uuid.UUID, items []Extracted, extractedBy string) ([]model.DigitalEntity, error)`.
   - Use a single `pgx.Batch` for the inserts; rely on `uq_entity_case_norm` unique index — on conflict, `DO NOTHING RETURNING` pattern (use `ON CONFLICT (case_id, entity_type, normalized_value) DO UPDATE SET updated_at = now() RETURNING *` so re-extraction is idempotent and still returns the row).
5. Create `internal/entity/service.go` tying extraction + repository together: `func (s *Service) ExtractAndPersist(ctx context.Context, caseID uuid.UUID, complaintRefID *uuid.UUID, sourceText, extractedBy string) ([]model.DigitalEntity, error)`.
6. Write `internal/entity/extractor_test.go` — table-driven tests covering:
   - A paragraph containing one of each entity type, asserting all five are found with correct type and normalized value.
   - An overlap case: a UPI-looking string (`user@okhdfcbank`) must NOT also be reported as EMAIL or SOCIAL.
   - A false-positive guard: `999.999.999.999` must NOT match as a valid IP.
   - Confidence scores fall within expected bands per type.

## Verification Checkpoint
```bash
cd backend && go test ./internal/entity/... -v
# all table-driven cases pass

# quick manual check via a throwaway test binary or `go run` snippet:
cat <<'EOF' > /tmp/sample.txt
Suspect contacted victim from 192.168.10.55 using email scammer123@gmail.com,
phone +91-9876543210, and demanded payment to fraud@okhdfcbank. Also active
on instagram.com/fake_investor_2026.
EOF
# (wire a temporary main.go debug call or use the test file's fixture — confirm 5 entities detected)
```

## Documentation Requirements
- `internal/entity/doc.go`: explains the extraction pipeline, priority ordering for overlap resolution, and confidence scoring rationale.
- Comment above each regex explaining what it matches and its known false-positive/negative tradeoffs.
- `backend/migrations/SCHEMA_NOTES.md`: no change needed here (table already documented in Checkpoint 2), but add a one-line cross-reference: "Populated by internal/entity — see internal/entity/doc.go".
