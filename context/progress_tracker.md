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
- [x] Resolve font/token drift and remove non-AI side-stripe usage
- [x] Add `case_workflow_state` schema, migration, service, router, and typed API contract
- [x] Build Case Command Center with workflow spine, blockers, next-best action, and recent activity
- [x] Group case navigation into Work / Evidence / Record without breaking deep links
- [x] ✅ CHECKPOINT: seeded case opens with a truthful workflow state and one obvious next action


### 8B — Adaptive paths and entity intelligence
- [x] Add append-only investigation path revisions and visible change explanations
- [x] Normalize case entities and preserve raw mentions/confidence
- [x] Add entity relationships and grouped entity pivot panel
- [x] Add cautious possible-match related-case search with source disclosure
- [x] ✅ CHECKPOINT: provider response creates a cited path revision and entity pivot

### 8C — Evidence workspace
- [x] Add evidence markers, transcript segments, timestamps, and entity links
- [x] Add original/translation review surface and explicit “add to case” actions
- [x] Add audit events for evidence links and promoted facts
- [x] ✅ CHECKPOINT: evidence marker links to an entity and appears in the audit trail

### 8D — Cited case copilot
- [x] Add `ai_citations` and `copilot_messages` schema, migration, and typed API contracts
- [x] Add case-scoped read-only copilot with named prompts and source chips
- [x] Add deterministic fallback and audited question/answer events
- [x] ✅ CHECKPOINT: three seeded questions return grounded answers and no citation-free output

### 8E — Request quality and response correlation
- [x] Add pre-dispatch readiness service and checklist UI
- [x] Block dispatch when required data, approval, or provenance is missing
- [x] Add explainable provider-response correlations with promote-to-diary action
- [x] ✅ CHECKPOINT: flagged response rows trace back to raw data, entities, and a path step


### 8F — Demo hardening
- [x] Seed Phase 8 examples and add fresh-seed smoke steps
- [x] Verify keyboard, contrast, reduced-motion, responsive, loading, empty, and failure states
- [x] Rehearse IO → SHO → Legal Advisor flows twice from a fresh seed
- [x] ✅ CHECKPOINT: golden path plus one Phase 8 intelligence moment completes in under 7 minutes

## Phase 9 — Ferrari Design System Overhaul
- [x] Phase 9A — Global Styles & Core Tokens Setup (CSS variables, tailwind.config mapping, backgrounds, layout fonts)
- [x] Phase 9B — Navigation Sidebar & Command Topbar (sidebar, topbar, active/hover navigation styles)
- [x] Phase 9C — Case Workspace Hero & Signal Cards (case hero layout, 4-column signals, confidence indicators)
- [x] Phase 9D — Workspace Panels & Steppers (stepper links, entity grid rows, SVG timeline charts)
- [x] Phase 9E — Summary, Dialogs & Micro-interactions (warm surface card, glass overlays, toast notification transitions)
- [x] Phase 9F — Integration & Verification (contrast validation, responsive breakpoints, golden path verification)
- [x] ✅ CHECKPOINT: Full design overhauled to Ferrari command center look, all functions verified.




- [x] Professional polish pass: removed decorative grid/glow/stripe treatments, tightened shared controls, and fixed authenticated-shell prerendering.
- [x] Shell usability pass: retractable sidebar, flow-based case header, redundant scrollbar cleanup, and right-edge copilot drawer.
- [x] Shell and login polish: pinned sidebar footer, single workspace scroll owner, aligned spacing, and restrained sign-in surface.

## Phase 10 — Selective Upstream Feature Integration
Planning baseline: `vraj` remains canonical; current uncommitted work is protected. Source branches are feature references only.

- [x] Read and compare upstream branch histories (`origin/main`, `origin/crimeos/digitalfootprint`, `origin/crimeos/videoAnalyzer`)
- [x] Document selective-port architecture, merge order, conflict policy, and acceptance checkpoints in `architecture.md` and `build_plan.md`
- [x] 10.0 Protected baseline: preserve/commit current `vraj` work before merge operations
- [x] 10A Timeline Agent + CCTV pinning: native integration of `origin/main` timeline feature
- [x] 10A checkpoint: timeline synthesis, officer note, CCTV pin, provenance, and audit verified
- [x] 10B OSINT enrichment: native FastAPI/PostgreSQL/Next.js port of digital-footprint behavior
- [x] 10B checkpoint: deterministic entity risk summary, sources, unconfirmed pivots, and audit verified
- [x] 10C Video evidence analysis: native case-scoped upload, background progress, report, and seekable timeline
- [x] 10C checkpoint: video workflow and audit verified without Celery/Redis/Mongo or a duplicate app
- [x] 10D Full integration verification: golden path plus one intelligence moment from a fresh seed
- [x] 10D checkpoint: all retained `vraj` features and selected upstream features pass smoke/review checks

### 10D Verification Summary (2026-07-18)
- Frontend: `next build` ✅ zero errors, 14 routes compiled cleanly
- TypeScript: `tsc --noEmit` ✅ zero errors
- Backend: `python -c "import app.main"` ✅ all routers import cleanly (auth, cases, ingestion, paths, requests, responses, summaries, audit, mock_provider, mock_cctns, evidence, command_center, entities, copilot, timeline, osint, video)
- Raw fetch() audit: ✅ all `fetch()` calls are inside `lib/api.ts` (generic wrapper + OSINT dossier export)
- Route provenance review: ✅ every Phase 10 router uses `get_current_user`, no business logic in HTTP layer
- Phase 10 seeds added: 6 timeline events + 1 CCTV evidence + 1 video fixture for Case 2
- DEMO_SCRIPT updated with 10A/10B/10C moments + fresh-seed smoke checklist
- ui_registry.md: Phase 10 components marked BUILT
- memory.md written at project root
