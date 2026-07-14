# Stage 2 · Checkpoint 1 — Service Provider Master Data & LERS Template Engine

## Objective
Seed `service_providers` with realistic demo data and build `internal/lers`, a template engine that renders provider- and template-type-specific legal request documents from confirmed entities + case metadata.

## Context
- Table: `service_providers`, `legal_requests` (from Stage 1 migrations — `legal_requests` DDL already exists from `ARCHITECTURE.md` §1.3, applied in Stage 1 Checkpoint 2).
- Template types: `IP_LOG_REQUEST`, `CDR_REQUEST`, `KYC_REQUEST`, `ACCOUNT_FREEZE_REQUEST`, `SUBSCRIBER_DETAILS_REQUEST`, `BANK_STATEMENT_REQUEST`.
- Only `CONFIRMED` entities may be linked into a legal request (enforce in Checkpoint 2's handler, not here — this checkpoint is pure rendering logic).

## Step-by-Step Instructions
1. Create `/backend/migrations/0012_seed_service_providers.sql` inserting 6-8 realistic demo rows across categories: e.g. Airtel/Jio (TELECOM), HDFC Bank/SBI (BANK), Meta Platforms/Google (SOCIAL_PLATFORM), an ISP entry. Include plausible `nodal_officer_email` values using a `@lea-demo.internal` domain (clearly fictional, not real company legal contacts) and `sla_hours` per RBI/TRAI-typical turnaround (banks 168h, telecoms 240h, platforms 336h as reasonable demo defaults).
2. Create `/backend/templates/` directory with one `text/template` file per template type:
   - `ip_log_request.tmpl`, `cdr_request.tmpl`, `kyc_request.tmpl`, `account_freeze_request.tmpl`, `subscriber_details_request.tmpl`, `bank_statement_request.tmpl`.
   - Each template is a formal legal-notice body with placeholders for: `{{.RequestNumber}}`, `{{.CaseNumber}}`, `{{.ProviderName}}`, `{{.NodalOfficerEmail}}`, `{{.IssuingOfficerName}}`, `{{.IssuingOfficerDesignation}}`, `{{.PoliceStation}}`, `{{.LegalBasis}}` (e.g. "Section 91 CrPC" / "Section 94 BNSS" — use a generic placeholder, not a hardcoded outdated section number, since criminal procedure section numbers vary by jurisdiction/era — inject via config), `{{.RequestedEntities}}` (range over linked entity values with their type), `{{.DateIssued}}`, `{{.ResponseDeadline}}`.
   - Structure each as: letterhead block → subject line → legal authority citation → itemized ask (the specific data fields being requested, tailored per template type — e.g. `cdr_request.tmpl` asks for "call detail records including tower location logs for the period specified" while `bank_statement_request.tmpl` asks for "account statement, KYC documents, and linked UPI mandates").
3. Create `internal/lers/engine.go`:
   - `type RenderInput struct { RequestNumber, CaseNumber, ProviderName, NodalOfficerEmail, IssuingOfficerName, IssuingOfficerDesignation, PoliceStation, LegalBasis string; RequestedEntities []EntityLine; DateIssued, ResponseDeadline time.Time }`.
   - `type EntityLine struct { EntityType, Value string }`.
   - `func (e *Engine) Render(templateType string, input RenderInput) (string, error)` — loads the matching `.tmpl` file (embed via `//go:embed templates/*.tmpl` for zero-runtime-path-dependency), executes it, returns the rendered text.
   - Validate `templateType` against the known enum before lookup; return a typed `ErrUnknownTemplateType` if not recognized.
4. Create `internal/lers/pdf.go`:
   - `func RenderToPDF(renderedText string, outPath string) error` — for hackathon scope, generate a simple PDF from the rendered text using Go stdlib-adjacent minimal approach: if no PDF library is pre-approved, generate a well-formatted HTML file instead and name the function `RenderToDocument` returning an `.html` path (update `TRAE_SYSTEM_INSTRUCTIONS.md` approved-deps list only if you introduce a minimal pure-Go PDF writer — flag this decision explicitly rather than silently adding a dependency).
5. Create `internal/lers/request_number.go`:
   - `func GenerateRequestNumber(seq int, year int) string` returning format `LERS/{year}/{seq:06d}` e.g. `LERS/2026/000123`. Sequence source will be a Postgres sequence or `COUNT(*)+1` guarded by a transaction in Checkpoint 2 — this function is pure formatting only.
6. Write `internal/lers/engine_test.go` — table test rendering each of the 6 template types with a fixture `RenderInput`, asserting the output contains the request number, provider name, and every entity value from `RequestedEntities`.

## Verification Checkpoint
```bash
cd backend && go test ./internal/lers/... -v

psql "$POSTGRES_DSN" -c "SELECT name, provider_category, sla_hours FROM service_providers;"
# expect 6-8 seeded rows across TELECOM/BANK/SOCIAL_PLATFORM/ISP

# manual render check (temporary test main or via the test file's golden output):
go test ./internal/lers/... -run TestRenderAllTemplateTypes -v
# inspect printed/rendered output for legal-document formatting sanity
```

## Documentation Requirements
- `internal/lers/doc.go`: explains the template-per-type strategy and where to add a new template type (checklist: add `.tmpl` file → add to enum validation → add fixture test case).
- Comment at top of each `.tmpl` file naming which real-world legal mechanism it demo-represents (clearly marked as illustrative/hackathon-fictional, not actual legal advice).
- `backend/migrations/SCHEMA_NOTES.md`: add a note that `0012_seed_service_providers.sql` data is demo-only and must be replaced with real nodal-officer registries before any production use.
