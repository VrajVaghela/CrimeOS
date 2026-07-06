# Build Plan — Crime OS AI (hackathon-sequenced)

Phases are ordered by **demo risk**: the golden path first, polish later, bonuses last.
Rule: do not start phase N+1 until phase N's demo checkpoint passes end-to-end.

---

## Phase 1 — Foundation & Data Layer
Goal: running skeleton + demo-ready database.
1. `docker-compose.yml` with Postgres 16 + pgvector; `.env.example`
2. FastAPI skeleton: `main.py`, `config.py`, `database.py`, CORS, health endpoint
3. All SQLAlchemy models + Alembic initial migration (full schema from `architecture.md`)
4. `gemini_client.py` with `generate_json()`, `transcribe()`, `embed()` + retry + fallback-cache
5. Seed datasets: BNS/BNSS/BSA sections (curated ~60 relevant sections), 3–4 SOP docs (cyber fraud, theft, harassment), 3 users, LERS-style request templates
6. Seed script: chunks + embeds SOPs into `sop_chunks`
7. Next.js skeleton: layout, shadcn/ui install, `lib/api.ts`, login page, JWT auth flow

**Checkpoint:** login as IO → empty dashboard renders → `/docs` Swagger shows all planned routes.

## Phase 2 — Multimodal Ingestion (evaluation criterion #1)
1. Upload endpoint + file storage (local `uploads/`)
2. `ingestion_service`: PDF → Gemini file input; image → Gemini vision; audio → Gemini audio (whisper fallback stub)
3. Language detection + translation to English (keep original)
4. `extraction_service`: structured entities via Gemini JSON mode → `extracted_entities`
5. UI: case creation wizard — upload → processing state → **side-by-side original vs. extracted** review screen with editable entities (officer-in-the-loop sells trust)

**Checkpoint:** upload Gujarati PDF, Hindi audio, handwritten image → correct entities on screen.

## Phase 3 — Investigation Paths & Legal Sections (criterion #2)
1. `rag_service`: embed query → pgvector cosine top-k SOP chunks + keyword match legal sections
2. `path_service`: Gemini (pro model) with complaint + retrieved chunks → classified crime type, ordered path steps **with SOP citations**, suggested BNS/BNSS/BSA sections with reasoning
3. Persist path + steps + case_sections
4. UI: case "Investigation Path" tab — stepper with status controls, citation popovers showing actual SOP text, legal sections panel with section text + AI reasoning

**Checkpoint:** cyber-fraud complaint → sensible steps citing the cyber-fraud SOP → correct BNS sections displayed with sources.

## Phase 4 — Automated Legal Requests (criterion #3)
1. Request templates (telecom CDR, bank freeze/KYC, platform data) as Jinja2, LERS-style headers
2. `legal_request_service`: pick template from path step → fill from extracted entities → draft
3. Approval flow: draft → (SHO approve if RBAC done, else IO) → dispatch via SMTP to demo mailbox → status `dispatched`
4. Mock provider router: endpoint that "responds" with a crafted CSV/PDF after a button press (demo control!) → status `responded`
5. UI: Requests tab — draft preview/edit, dispatch button, status timeline

**Checkpoint:** click path step "Obtain CDR" → filled request → email lands in demo inbox → trigger mock response.

## Phase 5 — Response Analytics, Summaries, Audit (criterion #4)
1. `analytics_service`: parse mock CSV/PDF response → `parsed_data` JSONB → Gemini insight generation ("suspicious pattern" callouts) → table + highlights UI
2. `summary_service`: assemble full case activity → Gemini case summary → versioned `case_summaries`; regenerate = new version; version diff view
3. Auto case log: render `audit_events` as a timeline on case overview
4. Case search (title/number/entity)

**Checkpoint:** THE FULL GOLDEN PATH runs end-to-end without touching the DB. Rehearse it.

## Phase 6 — Bonuses & Demo Polish (only after Phase 5 checkpoint)
Priority order:
1. **Role-based access**: route guards + per-role dashboards (SHO approval queue, Legal Advisor section-review view)
2. **Mock CCTNS/eGujcop API**: `/mock/cctns/fir` endpoint + "Sync to CCTNS" button that shows a payload
3. **Evidence upload + AI tagging**: image upload → Gemini tags → gallery
4. Demo polish: loading states, empty states, seeded second case, glow/motion pass per ui_rules, DEMO_SCRIPT.md
5. Documentation deliverables: architecture diagram, SOP-grounding explanation, sample anonymized datasets in `data/`

**Checkpoint:** 5-minute demo rehearsed twice from a fresh seeded DB.

---

## Cut List (if time runs out, cut in this order)
1. Version diff view (keep version list)
2. Case search
3. Evidence tagging bonus
4. CCTNS mock bonus
5. Editable entity review (make read-only)
NEVER cut: golden path, SOP citations in UI, audit timeline.
