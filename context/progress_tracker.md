# Progress Tracker — Crime OS AI (living document)

Update IMMEDIATELY upon completing any feature: `[ ]` → `[x]`. If a feature is cut, mark `[~]` with a one-word reason. A phase is DONE only when its **demo checkpoint** passes.

## Phase 1 — Foundation & Data Layer
- [x] docker-compose (Postgres + pgvector) + .env.example
- [x] FastAPI skeleton (main, config, database, CORS, /health)
- [x] All SQLAlchemy models + initial migration
- [x] gemini_client.py (generate_json / transcribe / embed + retry + fallback cache)
- [x] Seed datasets: BNS/BNSS/BSA sections, SOP docs, 3 users, request templates
- [x] Seed script incl. SOP chunk embeddings
- [x] Next.js skeleton + shadcn + lib/api.ts + login + JWT flow
- [x] ✅ CHECKPOINT: login → dashboard renders, /docs shows routes
  - Verified by user on 2026-07-06.

## Phase 2 — Multimodal Ingestion
- [x] Upload endpoint + local file storage
- [x] ingestion_service: PDF / image / audio via Gemini
- [x] Language detection + translation (original preserved)
- [x] extraction_service: entity extraction (JSON mode)
- [x] UI: complaint wizard + side-by-side review + editable entities
- [x] Cases list page + create case dialog + case detail layout with tabs
- [x] ✅ CHECKPOINT: Gujarati PDF, Hindi audio, handwritten image → correct entities

## Phase 3 — Investigation Paths & Legal Sections
- [x] rag_service: pgvector retrieval over SOP chunks + legal section match
- [x] path_service: crime classification + steps w/ SOP citations + BNS/BNSS/BSA suggestions
- [x] Persistence: paths, steps, case_sections
- [x] UI: Path tab (stepper, citation popovers, legal sections panel)
- [x] ✅ CHECKPOINT: fraud complaint → grounded path + correct sections with sources

## Phase 4 — Automated Legal Requests
- [x] Jinja2 LERS-style templates (telecom CDR, bank freeze/KYC, platform)
- [x] legal_request_service: template selection + entity fill → draft
- [x] Approval + SMTP dispatch + status tracking
- [x] Mock provider router + triggered mock response
- [x] UI: Requests tab (preview/edit, dispatch, status timeline)
- [x] ✅ CHECKPOINT: path step → request → email in demo inbox → mock response

## Phase 5 — Analytics, Summaries, Audit
- [x] analytics_service: parse provider CSV/PDF → Gemini AI insights + highlighted table
- [x] summary_service: versioned case summaries + regenerate (Gemini-powered)
- [x] Audit timeline on case overview (auto case log, /audit/cases/{id} endpoint)
- [x] Case search (/cases/search?q=... + debounced search bar in UI)
- [x] ✅ CHECKPOINT: FULL GOLDEN PATH end-to-end, rehearsed

## Phase 6 — Bonuses & Demo Polish
- [x] Role-based access (IO / SHO / Legal Advisor views + guards)
- [x] Mock CCTNS/eGujcop API + "Sync to CCTNS" button
- [x] Evidence image upload + AI tagging
- [x] Polish: loading/empty states, second seeded case, DEMO_SCRIPT.md
- [x] Deliverable docs: architecture diagram, SOP-grounding note, sample datasets in data/
- [ ] ✅ CHECKPOINT: 5-min demo rehearsed twice from fresh seed

## Phase 7 — Frontend Design Refinement & Impeccable Polish
- [x] Typography Pass: Space Grotesk layout, letter-spacing check, Indic fallbacks
- [x] Glow-on-Demand & Glass Integration: hover glows, glass overlays, shadow cleanup
- [x] Contrast & Color Review: WCAG AA contrast check, <=10% primary blue budget
- [x] Interactive Pulse & Timeline Motion: pulse badges/steppers, refined connectors
- [x] Ingestion View Amber Alerts: Warning Amber borders on low-confidence entities
- [x] Impeccable Detect Audit: run `npx impeccable detect` and fix anti-patterns
- [x] ✅ CHECKPOINT: Golden Path demo showing high-contrast, glow-elevated command surfaces

## Phase 8 — Investigation Intelligence & Command Center
### 8A — Design and workflow foundation
- [ ] Resolve font/token drift and remove non-AI side-stripe usage
- [ ] Add `case_workflow_state` schema, migration, service, router, and typed API contract
- [ ] Build Case Command Center with workflow spine, blockers, next-best action, and recent activity
- [ ] Group case navigation into Work / Evidence / Record without breaking deep links
- [ ] ☐ CHECKPOINT: seeded case opens with a truthful workflow state and one obvious next action

### 8B — Adaptive paths and entity intelligence
- [ ] Add append-only investigation path revisions and visible change explanations
- [ ] Normalize case entities and preserve raw mentions/confidence
- [ ] Add entity relationships and grouped entity pivot panel
- [ ] Add cautious possible-match related-case search with source disclosure
- [ ] ☐ CHECKPOINT: provider response creates a cited path revision and entity pivot

### 8C — Evidence workspace
- [ ] Add evidence markers, transcript segments, timestamps, and entity links
- [ ] Add original/translation review surface and explicit “add to case” actions
- [ ] Add audit events for evidence links and promoted facts
- [ ] ☐ CHECKPOINT: evidence marker links to an entity and appears in the audit trail

### 8D — Cited case copilot
- [ ] Add `ai_citations` and `copilot_messages` schema, migration, and typed API contracts
- [ ] Add case-scoped read-only copilot with named prompts and source chips
- [ ] Add deterministic fallback and audited question/answer events
- [ ] ☐ CHECKPOINT: three seeded questions return grounded answers and no citation-free output

### 8E — Request quality and response correlation
- [ ] Add pre-dispatch readiness service and checklist UI
- [ ] Block dispatch when required data, approval, or provenance is missing
- [ ] Add explainable provider-response correlations with promote-to-diary action
- [ ] ☐ CHECKPOINT: flagged response rows trace back to raw data, entities, and a path step

### 8F — Demo hardening
- [ ] Seed Phase 8 examples and add fresh-seed smoke steps
- [ ] Verify keyboard, contrast, reduced-motion, responsive, loading, empty, and failure states
- [ ] Rehearse IO → SHO → Legal Advisor flows twice from a fresh seed
- [ ] ☐ CHECKPOINT: golden path plus one Phase 8 intelligence moment completes in under 7 minutes



