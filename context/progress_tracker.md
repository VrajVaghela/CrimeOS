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
- [ ] Jinja2 LERS-style templates (telecom CDR, bank freeze/KYC, platform)
- [ ] legal_request_service: template selection + entity fill → draft
- [ ] Approval + SMTP dispatch + status tracking
- [ ] Mock provider router + triggered mock response
- [ ] UI: Requests tab (preview/edit, dispatch, status timeline)
- [ ] ✅ CHECKPOINT: path step → request → email in demo inbox → mock response

## Phase 5 — Analytics, Summaries, Audit
- [ ] analytics_service: parse provider CSV/PDF → insights + highlighted table
- [ ] summary_service: versioned case summaries + regenerate
- [ ] Audit timeline on case overview (auto case log)
- [ ] Case search
- [ ] ✅ CHECKPOINT: FULL GOLDEN PATH end-to-end, rehearsed

## Phase 6 — Bonuses & Demo Polish
- [ ] Role-based access (IO / SHO / Legal Advisor views + guards)
- [ ] Mock CCTNS/eGujcop API + "Sync to CCTNS" button
- [ ] Evidence image upload + AI tagging
- [ ] Polish: loading/empty states, second seeded case, DEMO_SCRIPT.md
- [ ] Deliverable docs: architecture diagram, SOP-grounding note, sample datasets in data/
- [ ] ✅ CHECKPOINT: 5-min demo rehearsed twice from fresh seed


