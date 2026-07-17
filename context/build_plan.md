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


---

## Phase 9 — Ferrari Design System Migration
Goal: Overhaul the design & UI of the application to match the Ferrari Cyber-Command Console aesthetics.

### Phase 9A — Global Styles & Core Tokens Setup
1. Define custom properties in `globals.css` base layer (`--bg`, `--surface`, `--surface-warm`, `--fg`, `--fg-2`, `--muted`, `--accent`, `--border`, `--border-soft`, etc.).
2. Map tailwind base variables to corresponding HSL values in `globals.css` `:root` class.
3. Configure `tailwind.config.ts` to extend border radius squircle definitions (`squircle` 12px, `squircle-sm` 8px).
4. Set up the dot grid background on `body` and red radial glow atop the workspace layout in CSS.
5. Define Ferrari Sans and SF Mono in font variables within Next.js root layout.

**Checkpoint:** App layout shows correct deep carbon-black backgrounds, off-white text, and borders.

### Phase 9B — Navigation Sidebar & Command Topbar
1. Restructure the sidebar panel (fixed 248px width, narrows to 214px at 1080px).
2. Format brand lockup with glass shield brand mark and red accent border.
3. Apply Ferrari Red active highlight for sidebar navigation links, keeping standard links muted off-white.
4. Position breadcrumb navigation, full case search bar (max width 280px, red focus ring on active), and square icon buttons in topbar (68px).

**Checkpoint:** Sidebar and topbar match the layouts and interactions with proper active/hover indicators.

### Phase 9C — Case Workspace Hero & Signal Cards
1. Style Case Hero: 2-column squircle layout (`1.3fr 0.7fr` collapsing at 1080px). Wrap the AI summary inside a left-bordered info blue block.
2. Restructure 4 Signal Cards in a grid (`repeat(4, 1fr)`). Add viewport entry count-up animations for metric values.
3. Implement confidence badges with conditional coloring (green for >=85%, yellow for 70-84%, amber border on input for <70%).

**Checkpoint:** Ingestion details, case confidence metrics, and confidence badges render with accurate layout proportions and colors.

### Phase 9D — Workspace Panels & Steppers
1. Apply Squircle (`12px`) radii to all panels, case-hero cards, and summary cards.
2. Format entity list rows into 3-column grid layouts.
3. Update investigation path stepper: completed/active steps connected by red-to-blue gradient lines, current step having glass bg with red accent border, and info blue citation buttons.
4. Update SVG timeline charts with red-to-blue horizontal gradient stroke lines and gradient graph fill underneath.
5. Apply vertical red-to-blue gradient to active timeline connector vertical lines.

**Checkpoint:** Stepper, entity layout, timelines, and SVG charts render with red-to-blue gradient accents.

### Phase 9E — Summary, Dialogs & Micro-interactions
1. Apply warm surface bg (`#23130f`), blue AI icon, and red primary CTA button on summary cards.
2. Refactor toast notification element, sliding entity review sheet, and citation modal dialog. Use `.glass` panel over a darkened blurred backdrop.
3. Apply button transitions (130ms duration, scale-105 on hover, red glow).
4. Implement prefers-reduced-motion media query block.

**Checkpoint:** Dialogs open correctly, toast messages auto-dismiss, and animations run smoothly.

### Phase 9F — Integration & Verification
1. Verify contrast ratio compliance (all texts pass WCAG AA).
2. Audit responsive layout breakpoints (1080px, 760px, 420px, 360px) to ensure no headline overflows or visual glitches.
3. Run the golden path end-to-end to ensure all features function perfectly under the new design tokens.

**Checkpoint:** The full golden path works end-to-end with high-quality visual polish.

---

## Phase 10 — Selective Upstream Feature Integration

Goal: bring the useful features from `origin/main`,
`origin/crimeos/digitalfootprint`, and `origin/crimeos/videoAnalyzer` into
`vraj` while preserving every current feature, route, design token, and golden
path behavior. This phase is a selective port, not a wholesale multi-project
merge.

### Phase 10.0 — Protected baseline and merge preparation
1. Record the current `vraj` commit and dirty-worktree file list.
2. Commit or safely stash the current uncommitted Ferrari/shell work before any
   Git merge; never reset or checkout away current work.
3. Refresh remote refs and verify the source commits: `origin/main` timeline
   (`cfaf939`/`0d06aca`), digital footprint (`dc33884`), and video analyzer
   (`a6f6c29`).
4. Create a temporary integration branch from `vraj` for conflict resolution;
   keep `vraj` itself recoverable until all checkpoints pass.

**Checkpoint:** Current `vraj` UI and backend changes are recoverable, and the
working tree is clean before merge operations begin.

### Phase 10A — Timeline Agent and CCTV pinning (`origin/main`)
1. Merge only the compatible timeline history with `--no-commit` first.
2. Resolve route/layout conflicts in favor of the current authenticated App
   Router and Ferrari shell; adapt the upstream timeline page into
   `app/(authenticated)/cases/[id]/timeline/page.tsx`.
3. Add the timeline model, migration, schemas, service, router registration,
   typed API functions, and prompt constants while reusing existing evidence,
   audit, Gemini, and upload abstractions.
4. Add seed data and explicit UI states for synthesized events, CCTV analysis,
   officer notes, unsupported images, and Gemini fallback output.
5. Verify timeline events distinguish AI-generated events from officer notes,
   expose source references/confidence, and append audit entries.

**Checkpoint:** A seeded case opens the timeline, synthesizes events once,
accepts an officer note, and pins a CCTV frame without breaking the existing
case tabs or golden path.

### Phase 10B — Digital-footprint/OSINT enrichment (`origin/crimeos/digitalfootprint`)
1. Extract the feature contract from the Go branch: entity-scoped scan status,
   social-profile results, breach exposure, risk summary, discovered pivots, and
   exportable dossier data.
2. Implement native SQLAlchemy models/migration, Pydantic schemas, service, and
   router under the existing FastAPI app. Keep scans deterministic/demo-safe;
   do not introduce live Sherlock/Holehe/HaveIBeenPwned calls or new workers.
3. Attach results to `case_entities` and `ai_citations` with source labels,
   confidence, and an explicit unconfirmed status for discovered pivots.
4. Add typed `lib/api.ts` functions and a token-driven Ferrari
   `OsintEnrichmentPanel`/risk summary surface in the entity/case workspace.
5. Add seeded LOW/HIGH-risk examples, loading/error/not-found states, and audit
   events for scan creation, completion, failure, and dossier export.

**Checkpoint:** An officer can open a confirmed case entity, see a deterministic
OSINT risk summary with social/breach sources, and distinguish confirmed data
from unconfirmed pivots; the golden path remains unchanged.

### Phase 10C — Video evidence analysis (`origin/crimeos/videoAnalyzer`)
1. Extract the feature contract from the video branch: upload validation,
   progress polling, incident summary, risk level, timestamped timeline rows,
   and click-to-seek playback.
2. Implement it as an evidence workflow for an existing case using
   `EvidenceFile`, existing upload storage, FastAPI `BackgroundTasks`, and the
   existing Gemini gateway. Do not add Celery, Redis, Mongo, a second case
   table, or a second frontend application.
3. Persist timestamped events and provenance in the existing timeline/evidence
   aggregates; make video processing fallback deterministic when Gemini is
   unavailable.
4. Add typed API polling/report functions and a responsive Ferrari
   `VideoEvidenceWorkspace` that reuses existing evidence/timeline patterns and
   native HTML media controls.
5. Add safe upload limits/signature validation, partial/failure states, audit
   events, and a seeded short demo clip or fixture reference that does not
   require external services.

**Checkpoint:** An officer uploads a supported video to an existing case,
observes progress, opens the report, clicks a timeline event to seek the video,
and sees the action/source in the audit trail.

### Phase 10D — Integration verification and handoff
1. Run the existing frontend build/lint and backend import/smoke checks after
   each feature, not only at the end.
2. Run a fresh-seed golden-path rehearsal: complaint → path → cited legal
   request → provider response → analytics → summary → audit.
3. Run one intelligence rehearsal covering timeline/CCTV plus one OSINT or video
   moment, with keyboard, responsive, reduced-motion, loading, and failure-state
   checks.
4. Review every changed route for provenance, explicit officer actions, role
   checks, and no raw `fetch()` outside `lib/api.ts`.
5. Update `progress_tracker.md`, `ui_registry.md`, seed notes, and the smoke
   script only after the corresponding checkpoint passes.

**Checkpoint:** All retained `vraj` features still work, each selected upstream
feature has a passing checkpoint, and no out-of-scope infrastructure was added.


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
