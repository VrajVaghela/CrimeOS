---
name: LERS Template Authoring
description: Authors or extends a legal-request document template (text/template) in /backend/templates/ following this project's structure — letterhead, subject, legal authority citation, itemized ask. Use for Stage 2 Checkpoint 1 and any future new template_type additions.
---

# LERS Template Authoring

## Description
`internal/lers/engine.go` renders one `.tmpl` file per `legal_requests.template_type`. This skill keeps every template structurally consistent (so the rendering engine's placeholder set stays uniform) while letting the itemized-ask section vary per provider category, per ARCHITECTURE.md §1.2 step 4 and Stage 2 Checkpoint 1.

## When to Use
- Building one of the initial six templates (`IP_LOG_REQUEST`, `CDR_REQUEST`, `KYC_REQUEST`, `ACCOUNT_FREEZE_REQUEST`, `SUBSCRIBER_DETAILS_REQUEST`, `BANK_STATEMENT_REQUEST`).
- Adding a new template type later in the project — always pair with updating the enum validation in `engine.go` and adding a fixture test case (see the go-table-driven-tests skill).

## Instructions
1. **File location & naming**: `/backend/templates/<template_type_lowercase>.tmpl`, embedded via `//go:embed templates/*.tmpl` — never load templates from a runtime filesystem path.
2. **Required placeholder set** (every template must include all of these, even if some render as empty for that provider category):
   `{{.RequestNumber}} {{.CaseNumber}} {{.ProviderName}} {{.NodalOfficerEmail}} {{.IssuingOfficerName}} {{.IssuingOfficerDesignation}} {{.PoliceStation}} {{.LegalBasis}} {{.DateIssued}} {{.ResponseDeadline}}` and a `range` block over `{{.RequestedEntities}}`.
3. **Structure, top to bottom**:
   a. Letterhead block (police station name, case number, date).
   b. Subject line naming the template type in plain language ("Request for Call Detail Records").
   c. Legal authority citation using `{{.LegalBasis}}` — never hardcode a specific section number in the template body; it must come from config so jurisdiction/era changes don't require a template edit.
   d. Itemized ask — this is the ONE section that differs meaningfully per template type. Be specific about what data is being requested (e.g. CDR asks for "call detail records including tower location logs for the period specified"; bank statement asks for "account statement, KYC documents, and linked UPI mandates"). Vague asks are not acceptable — this document has to look like something an officer could actually attach to a real request.
   e. Response deadline using `{{.ResponseDeadline}}`.
   f. Signature block with `{{.IssuingOfficerName}}` / `{{.IssuingOfficerDesignation}}`.
4. **Top-of-file comment**: every `.tmpl` file starts with an HTML/text comment naming which real-world legal mechanism it demo-represents, explicitly marked as illustrative/hackathon-fictional and not actual legal advice — this is mandatory, not optional (Stage 2 Checkpoint 1 documentation requirement).
5. **Register the new type** in `internal/lers/engine.go`'s enum validation before it's reachable via the API — a template file existing on disk with no corresponding enum entry is a dead file, not a usable feature.
6. **Add a fixture test case** in `engine_test.go` rendering the new type and asserting the output contains the request number, provider name, and every value from a sample `RequestedEntities` slice.

## Example itemized-ask snippets (for calibration, not copy-paste)
- `CDR_REQUEST`: "call detail records (voice, SMS, data sessions) including originating/terminating numbers, timestamps, duration, and cell tower/location logs"
- `KYC_REQUEST`: "customer identification documents, proof of address, and account-opening form on file for the subscriber/account holder identified below"
- `ACCOUNT_FREEZE_REQUEST`: "immediate freeze of the account(s) identified below pending further legal process, and confirmation of freeze execution"
