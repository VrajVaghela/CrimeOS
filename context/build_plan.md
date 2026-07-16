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

## Phase 7 — Frontend Design Refinement & Impeccable Polish
Goal: Polish the frontend visually using the Impeccable design system guidelines, resolving any slop and achieving a premium cyber-command console look.
1. **Typography Pass**: Align display typography with Space Grotesk and verify display letter-spacing is >= -0.04em. Set Inter for body and Noto Sans for Indic script fallback.
2. **Glow-on-Demand & Glass Integration**: Implement utility glass overlays and hover-based primary glows on stat cards, steppers, and action buttons. Remove standard gray drop shadows.
3. **Contrast & Color Review**: Audit all slate/amber text on midnight backgrounds to ensure WCAG AA compliance. Lock primary blue usage to <=10% of surface area.
4. **Interactive Pulse & Timeline Motion**: Add pulse animations on active statuses, processing banners, and live stepper nodes. Refined vertical stepper connector transitions.
5. **Ingestion View Amber Alerts**: Wire Warning Amber borders to low-confidence (<70%) entity extraction fields in the Case Creation Wizard.
6. **Impeccable Detect Audit**: Run `npx impeccable detect` on frontend components and fix any flagged anti-patterns (no diagonal striped backdrops, no double-border metrics).

**Checkpoint:** Complete visual run-through of the Golden Path demo showing high-contrast, glow-elevated command surfaces without UI slop.

---

## Phase 8 — Investigation Intelligence & Command Center
Goal: make the completed golden path feel like one adaptive, evidence-grounded investigation workspace. Do not add real integrations, mobile apps, new infrastructure, or autonomous dispatch.

### Phase 8A — Design and workflow foundation
1. Resolve visual drift: Space Grotesk/Inter/JetBrains Mono, token-only values, no non-AI side stripes, no browser alerts, restrained grid/glow usage.
2. Add `case_workflow_state` and a derived command-center service that returns current stage, blockers, next action, completion percentage, and recent activity.
3. Replace the case overview with a Case Command Center: workflow spine, next-best-action panel, case health, key entities, active requests, latest response insight, and latest audit event.
4. Group case navigation into Work / Evidence / Record while retaining deep-linkable routes.

**Checkpoint:** A seeded case opens on one screen with an obvious next action and a truthful workflow state; every action still deep-links to the existing golden-path tabs.

### Phase 8B — Adaptive paths and entity intelligence
1. Add append-only path revisions with trigger type, parent revision, change reason, active revision, and superseded state.
2. Re-run path suggestion after verified entities, new evidence, or provider responses; show what changed and why with SOP/legal citations.
3. Normalize extracted entities into `case_entities`; retain raw mentions and confidence.
4. Add `entity_relationships` and a case-scoped entity graph/pivot panel for people, phones, accounts, IPs, locations, requests, and evidence.
5. Add related-case search only when a matching value and source are visible; never imply identity from a weak match.

**Checkpoint:** Adding a provider response creates a new visible path revision and links a suspicious entity to its source row, evidence, and recommended next step.

### Phase 8C — Evidence workspace
1. Extend evidence beyond image cards to source markers, transcript segments, timestamps, and linked entities.
2. Show original media/transcript alongside translation where available.
3. Add “add to case” actions that create an audit event and attach a source marker to the case diary/path.
4. Keep unsupported media behavior explicit; do not pretend a file was analyzed when fallback processing failed.

**Checkpoint:** An officer can open one evidence item, inspect the relevant transcript/source segment, link it to an entity, and see the action in the audit trail.

### Phase 8D — Cited case copilot
1. Add `copilot_messages` and `ai_citations`; all answers are case-scoped and read-only by default.
2. Add named prompts in `prompts.py` for next action, missing facts, evidence explanation, legal basis explanation, and response explanation.
3. Return source chips for complaint text, extracted entities, SOP chunks, legal sections, provider rows, evidence markers, and audit events.
4. Add deterministic fallback answers and log every question/answer as an audit event.

**Checkpoint:** The copilot answers three seeded questions with visible citations, never invents a source, and cannot dispatch or mutate a request from chat.

### Phase 8E — Request quality and response correlation
1. Add a pre-dispatch readiness service and UI checklist for entities, legal basis, date range, approval, recipient, and citation.
2. Block dispatch when required data is missing; show the exact fix and preserve the draft.
3. Return explainable response correlations: source row, matched entity, reason, confidence, and linked path step.
4. Add “promote to case diary/summary” actions with audit events and source citations.

**Checkpoint:** A request cannot be dispatched with missing required data, and every flagged provider insight can be traced back to raw data and a case entity.

### Phase 8F — Demo hardening
1. Seed the new command-center, entity, path-revision, evidence-marker, citation, and copilot examples.
2. Add the golden-path smoke script steps for command-center navigation and fresh-seed reset.
3. Run keyboard, contrast, reduced-motion, responsive, loading, empty, and failure-state checks.
4. Rehearse IO → SHO → Legal Advisor flows twice from a fresh seed.

**Checkpoint:** The full golden path plus one adaptive-path, evidence, copilot, and explainable-response moment completes in under 7 minutes without manual DB edits.

---

## Cut List (if time runs out, cut in this order)
For Phase 8, cut in this order:
1. Related-case matching
2. Entity graph visualization (keep grouped entity pivots)
3. Transcript/media timestamp polish
4. Copilot follow-up question history (keep cited one-shot answers)
5. Response-to-summary promotion shortcuts

For the existing MVP, cut in this order:
6. Version diff view (keep version list)
7. Case search
8. Evidence tagging bonus
9. CCTNS mock bonus
10. Editable entity review (make read-only)
NEVER cut: golden path, SOP citations in UI, audit timeline.
