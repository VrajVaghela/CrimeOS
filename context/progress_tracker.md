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
- [x] ✅ CHECKPOINT: 5-min demo rehearsed twice from fresh seed
  - Confirmed by user 2026-07-18 as part of the Phase 11D fresh-seed rehearsal.

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

## Phase 10 — UI/UX Improvement Pass
- [x] P0-1: Normalize tab bar — remove per-tab accent colors, standardize to muted/primary only
- [x] P0-2: Simplify case header — remove activeTabMeta label, consolidate meta row, move CCTNS button
- [x] P0-3: Fix eyebrow label overuse in command center signal cards and hero metadata rows
- [x] P0-4: Move bilingual text out of headings — English headings only, Hindi as subtitle
- [x] P0-5: Remove decorative gradient stripes and gradient icon backgrounds (ingestion + requests)
- [x] P0-6: Remove demo scaffolding from officer-facing UI (requests page email note + mock button)
- [x] P1-1: Dashboard role badge — move out of h1 into subtitle row
- [x] P1-2: Limit AnimatedMetric count-up to one card (Case Confidence only)
- [x] P1-3: Replace tab group text labels (Work/Evidence/Record) with dividers
- [x] P1-4: Reduce workflow spine node size w-11→w-8, fix focus ring
- [x] P1-5: Restore subtle scrollbars — remove global scrollbar-width:none from *
- [x] P1-6: Split dual-purpose command center card (requests + response) into two cards
- [x] P1-7: Remove duplicate AI-suggested badges on ingestion page
- [x] P1-8: Shorten stat card labels on dashboard
- [x] P1-9: Remove per-item stagger delays from all list rows
- [x] P1-10: Replace hover:glow-primary + translate on case list rows with subtle tint
- [x] P1-11: Remove animate-pulse-glow from dispatched request cards
- [x] P1-12: Path stepper — remove triple animation (glow-pulse + glass + pulse dot) on active step
- [x] P1-13: Replace native <select> for step status with DropdownMenu
- [x] P1-14: Add aria-current="page" to active tabs
- [x] P1-15: Fix touch targets on tab bar (py-2 px-3) and search clear button (h-9 w-9 wrapper)
- [x] P2-1: Login page — remove duplicate LockKeyhole icon from card header
- [x] P2-2: Remove "Navigation" eyebrow label from sidebar
- [x] P2-3: Wire or disable Settings/Help topbar buttons (add aria-disabled + tooltip)
- [x] P2-4: Fix broken indentation in path-stepper.tsx
- [x] P2-5: Remove all dead imports and dead constants (dashboard, cases, requests, workflow-spine)
- [x] P2-6: Audit copilot drawer z-index against semantic scale
- [x] ✅ CHECKPOINT: Golden Path demo with clean, professional, clutter-free UI

## Phase 9 — Ferrari Design System Overhaul
- [x] Phase 9A — Global Styles & Core Tokens Setup (CSS variables, tailwind.config mapping, backgrounds, layout fonts)
- [x] Phase 9B — Navigation Sidebar & Command Topbar (sidebar, topbar, active/hover navigation styles)
- [x] Phase 9C — Case Workspace Hero & Signal Cards (case hero layout, 4-column signals, confidence indicators)
- [x] Phase 9D — Workspace Panels & Steppers (stepper links, entity grid rows, SVG timeline charts)
- [x] Phase 9E — Summary, Dialogs & Micro-interactions (warm surface card, glass overlays, toast notification transitions)
- [x] Phase 9F — Integration & Verification (contrast validation, responsive breakpoints, golden path verification)
- [x] ✅ CHECKPOINT: Full design overhauled to Ferrari command center look, all functions verified.

## Branch: manan/multilingual — Hybrid Multilingual Support (EN / HI / GU)

### Tier 1 — Static UI i18n
- [x] JSON dictionaries: `frontend/lib/i18n/en.ts`, `hi.ts`, `gu.ts` (Golden Path keys only)
- [x] `LanguageContext` + `useLanguage()` + `useT()` hook with 3-level fallback (localStorage persistence)
- [x] `LanguageToggle` component (EN / हिंदी / ગુજ, design-token-only styling)
- [x] `layout.tsx` — wrapped with `LanguageProvider`
- [x] `dashboard/page.tsx` — all hardcoded strings replaced with `t()`, LanguageToggle in header
- [x] Tailwind config — `font-noto-devanagari` and `font-noto-gujarati` utility classes added

### Tier 2 — AI Output Translation
- [x] `TRANSLATION_PROMPT` constant added to `backend/app/ai/prompts.py` (entity-preserving rules)
- [x] `backend/app/services/translate_service.py` — Gemini via generate_text(), in-memory cache, fallback=English
- [x] `backend/app/routers/translate.py` — `POST /translate`, no audit event (display transform)
- [x] `backend/app/main.py` — translate router registered
- [x] `frontend/lib/api.ts` — `translateText()` added (sole HTTP gateway, no direct Gemini calls)
- [x] `frontend/hooks/use-translated-content.ts` — manual-trigger hook, module-level cache, isFallback flag
- [x] `cases/[id]/summary/page.tsx` — "Translate Summary" button + fallback indicator wired in

### Tier 3 — Already built (no changes)
- [x] Ingestion pipeline already translates Hindi/Gujarati/English → English for AI reasoning

### Architecture compliance
- [x] No audit events for translation (deliberate: display transform, not mutation)
- [x] Translated text never written to DB — authoritative English always the source
- [x] No Redis, no new DB tables, no Celery — in-memory cache only
- [x] All Gemini calls through `gemini_client.py` only
- [x] All prompts as named constants in `prompts.py`
- [x] Fallback always returns original English — demo cannot die


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

### 10D Post-review note (2026-07-18)
- Functional build/import checks passed, but `CODE_REVIEW.md` found security,
  shared-boundary, API-contract, router-convention, and UI-token debt in the
  Phase 10 ports. The 10D integration checkbox records feature integration;
  Phase 11 below is required before calling the code review closed or treating
  the demo as ship-ready.

## Phase 11 — Code Review Conformance & Demo Hardening
Planning source: `CODE_REVIEW.md` generated 2026-07-18. No implementation has
been performed for this phase yet.

### 11A — Security and API contract
- [x] Authenticate video status and report reads and enforce accessible-case ownership
- [x] Move video routes to the flat `/video` contract and update typed client paths
- [x] Replace `celery_state` with provider-neutral processing states across API/UI
- [x] Make video handlers async and remove router-level exception remapping drift
- [x] ✅ CHECKPOINT: unauthenticated video reads fail safely and the new contract works

### 11B — Shared AI, audit, and provenance boundaries
- [x] Route all video Gemini work through `gemini_client.py` with retry/cache/logging
- [x] Move the video forensic prompt into named `prompts.py` constants
- [x] Route chain-of-custody audit writes through `audit_service.record(...)` with actor identity
- [x] Replace MD5 content fingerprints with SHA-256 throughout the video workflow
- [x] ✅ CHECKPOINT: video fallback, provenance, actor-attributed audit, and chain verification pass
  - Re-verified in 11D: deterministic fallback validates against `IncidentReport`,
    provenance recorded in `ai_tags`, audit events carry actor `user_id`, SHA-256
    chain append/verify passes and detects tampering.

### 11C — Frontend conformance and feedback states
- [x] Replace raw palette/hex/shadow values in the flagged Phase 10 surfaces with UI tokens
- [x] Replace `catch (err: any)` with `unknown`-safe error narrowing
- [x] Replace request/CCTNS browser alerts with toast or `<Alert>` feedback
- [x] Preserve video loading, failure, responsive, and reduced-motion states under the new contract
- [x] ✅ CHECKPOINT: targeted UI passes token, strict-TypeScript, and no-browser-alert audits
  - Verified 2026-07-18: targeted static audit clean; local `tsc --noEmit` clean; `next build` clean.

### 11D — Verification and handoff
- [x] Run static boundary audits for Gemini imports, audit writes, prompts, auth, async routers, and Celery terminology
- [x] Run frontend build/type checks and verify all HTTP remains behind `lib/api.ts`
- [x] Confirm or perform the still-open Phase 6 five-minute fresh-seed rehearsal
- [x] Rehearse the golden path plus authenticated video upload → report → timeline seek from a fresh seed
- [x] Verify unauthenticated, inaccessible, Gemini-failure, invalid-file, oversized-file, and UI mutation-failure cases
- [x] ✅ CHECKPOINT: all `CODE_REVIEW.md` findings are closed or explicitly documented
  - Verified 2026-07-18. Static audits: only `gemini_client.py` imports google-genai;
    no `AuditEvent(...)` construction outside the model (`LedgerService` routes through
    `audit_service.record()` with actor `user_id`); `VIDEO_FORENSIC_ANALYSIS_PROMPT` is a
    named constant; both video reads require `get_current_user` + `_ensure_case_access`;
    video routers are `async`; no Celery vocabulary; SHA-256 end to end; flat `/video`
    prefix. Build: `tsc --noEmit` clean, `next build` clean (14 routes), `import app.main`
    OK. All frontend HTTP behind `lib/api.ts` (only two `fetch` calls, both in `api.ts`).
    Negative cases (TestClient, 7/7): unauth status/report → 401, authed-missing → 404,
    unsupported ext → 415, spoofed .mp4 signature → 415, missing case → 404, malformed
    case_id → 400. Access guard (unit): cross-owner IO → 403, owner IO / SHO allowed,
    missing case → 404. Deterministic fallback validates against `IncidentReport`.
    Chain of custody: time-separated append→verify passes, tamper detected, actor
    attributed. Also fixed `/api/v1/video` → `/video` doc drift in `DEMO_SCRIPT.md` and
    `memory.md`. Golden-path + video live rehearsal confirmed by user.

## Phase 12 — Multilingual Support Integration
Planning source: `context/multilingual_merge_plan.md` (2026-07-28). Ported the
i18n infrastructure from `origin/manan/multilingual` via cherry-pick (NOT a raw
merge — the branch predates Phase 8–11 and uses an older flat route structure).

- [x] Extract 9 new i18n files (frontend dictionaries, language context, toggle, translated-text-block, hook; backend translate router + service) from `origin/manan/multilingual`
- [x] Port 2 missing dependencies the extracted files needed: `TRANSLATION_PROMPT` in `prompts.py`, `translateText()` + `TranslateOut` in `lib/api.ts`
- [x] Wire `LanguageProvider` into `frontend/app/layout.tsx`
- [x] Add `<LanguageToggle>` to `frontend/app/(authenticated)/layout.tsx` topbar
- [x] Register `translate.router` in `backend/app/main.py`
- [x] ✅ CHECKPOINT: `import app.main` OK (translate wired); `tsc --noEmit` clean; `next build` clean (14 routes)
  - Verified 2026-07-28. Backend: all routers import incl. translate. Frontend:
    tsc exit 0, next build exit 0. NOTE: Phase 8–11 UI strings not yet keyed in
    en/hi/gu dictionaries — they render English via `useT()` fallback until a
    follow-up pass adds their keys (documented in merge plan as out-of-scope).

## Phase 13 — End-to-End Audit & Remediation (COMPLETED 2026-08-06)
Planning source: `context/END_TO_END_TESTING_REPORT.md` (2026-08-06). Multi-agent audit and full systemic remediation across 14 frontend routes & 19 FastAPI routers.

- [x] 13.1 Fix hardcoded localhost API URL in `responses/page.tsx` and export `API_URL` constant from `lib/api.ts`
- [x] 13.2 Fix premature Dispatch button enablement in `requests/page.tsx` by using `!readinessMap[req.id]?.is_ready`
- [x] 13.3 Refactor ingestion and evidence file upload routers to stream files directly to disk (`shutil.copyfileobj`) to eliminate memory exhaustion (OOM) risks
- [x] 13.4 Refactor tab sub-route matching in `layout.tsx` to extract sub-route segment using case ID split
- [x] 13.5 Convert section status update endpoint to RESTful JSON payload body using `SectionStatusUpdateIn` schema
- [x] 13.6 Add Pydantic `Field(..., min_length=10)` validation constraints to `LegalRequestUpdateIn` schema
- [x] 13.7 Add `AbortController` cancellation and unmount cleanup to search debouncing in `cases/page.tsx`
- [x] 13.8 Implement robust numeric FIR suffix extraction in `mock_cctns.py`
- [x] ✅ CHECKPOINT: Full system verification passed — Next.js build (`next build`) and Python compilation (`python -m compileall app`) pass with zero errors.

## Phase 14 — Full Localization (UI + AI Voice) — COMPLETED 2026-08-08
Planning source: `context/i18n_full_localization_plan.md`. Closes the gap Phase 12
left open: the selected language now governs **everything**, including the
copilot's spoken language.

Root defects (all fixed): copilot had no `lang` input and always answered English;
hardcoded `"English / हिंदी"` labels leaked Hindi into a Gujarati session (the
reported bug); 17 components never called `t()`; dictionaries covered only Phase
1–7 sections; status enums, dates and numbers were unlocalized; Tier-2 AI
translation was inconsistent.

### 14A — Language plumbing
- [x] `setActiveLang()` in `lib/api.ts` + `X-Lang` header on the shared `request()` wrapper
- [x] `LanguageProvider` sets `documentElement.lang` / `data-lang` and warns on missing keys in dev
- [x] `[data-lang]` Indic body-font rules in `app/globals.css`
- [x] New `lib/format.ts` (locale-aware date/time/number) and `lib/i18n/enums.ts` (enum → key)
- [x] `get_lang()` FastAPI dependency in `backend/app/dependencies.py`

### 14B — Dictionary expansion
- [x] Add `copilot`, `notifications`, `osint`, `video`, `evidence_workspace`, `workflow`, `status`, `roles`, `readiness`, `revisions`, `citations`, `entity`, `shell` sections to `en.ts`
- [x] Extend `common` and `command_center` with the missing leaves
- [x] Mirror every new key into `hi.ts` and `gu.ts` — **709 keys × 3 languages, exact parity, zero English leftovers** (only `IMEI`/`URL` intentionally identical)

### 14C — Component sweep
- [x] Key the components that never called `t()` (`notifications-popover`, `osint-enrichment-panel`, `video-evidence-workspace`, `evidence-review-workspace`, `status-badge`, `workflow-spine`, `citation-dialog`, `request-readiness-checklist`, `entity-review-field`, `ai-content-card`, `processing-card`, `path-revision-list`, `language-toggle`, `ui/dialog`, plus 8 route pages and the app shell)
- [x] Remove all hardcoded bilingual `"English / हिंदी"` concatenations
- [x] Replace hardcoded `"en-IN"` locale literals with `lib/format.ts` helpers (11 sites)
- [x] Localize `aria-label`, `title`, and `placeholder` attributes
- [x] New `lib/i18n/endonyms.ts` — the single sanctioned home for native language names, so the audit can forbid Indic literals everywhere else

### 14D — Copilot speaks the selected language (headline fix)
- [x] `lang` + optional canonical `intent` on `CopilotAskIn`; intent-based prompt routing replaces English keyword sniffing
- [x] `answer_localized` on the Gemini structured schema — one call returns authoritative English + localized display text
- [x] Output-language instruction + do-not-translate identifier list in `COPILOT_SYSTEM_PROMPT`
- [x] `COPILOT_FALLBACKS` (6 intents × 3 langs) so Gemini outages still answer in the selected language
- [x] Alembic migration `c3d4e5f6a7b8`: `copilot_messages.message_localized` (nullable) + `lang` (default `"en"`) — applied to the dev database
- [x] `copilot-panel.tsx` fully keyed: header, chips (send `intent`), placeholder, loading/error, citation source labels, timestamps

### 14E — Tier-2 auto-translation consistency
- [x] `TranslatedTextBlock` defaults to `autoTranslate`; manual button retained only for the verbatim raw-complaint pane
- [x] Auto-translate the missed surfaces (`responses/page.tsx` `ai_insights`, command-center AI summary, summary page)
- [x] `POST /translate/batch` (25-item cap) + durable `fallback_cache` read/write-through in `translate_service`
- [x] Per-tick request coalescer in `use-translated-content.ts` — a page of AI blocks makes **one** HTTP call, not N

### 14F — Verification
- [x] `frontend/scripts/i18n-audit.mjs` (`npm run i18n:audit`) — key parity, no untranslated values, no Indic literals outside `lib/i18n/`, no hardcoded locales. Also added `npm run verify` (audit + tsc + build).
- [x] `tsc --noEmit` clean; `next build` clean (14 routes); `python -m compileall app` clean; `import app.main` OK; migration applied and `alembic current` at head
- [x] ✅ CHECKPOINT PASSED — verified live against the running backend with seeded Case 1:
  - `X-Lang: en` → answer in Latin script, `lang="en"`
  - `X-Lang: hi` → answer in **Devanagari**, `lang="hi"`
  - `X-Lang: gu` → answer in **Gujarati script**, `lang="gu"`
  - `message_en` always carries the authoritative English for the audit trail
  - Chat history replays each message in the language it was generated for (`langs persisted: ['en','gu','hi']`)
  - Legal identifiers preserved verbatim through translation: `"Section 94 of BNSS હેઠળ કાનૂની નોટિસ મોકલો."` — BNSS and the IP `103.88.22.14` survive intact
  - `POST /translate/batch` returns per-item results (`मामले का सारांश`, `कानूनी आधार`)

**Known gaps (pre-existing, not introduced by Phase 14):** the repo has no ESLint
### Tier 2 — AI Output Translation
- [x] `TRANSLATION_PROMPT` constant added to `backend/app/prompts.py` (entity-preserving rules)
- [x] `backend/app/services/translate_service.py` — Gemini via generate_text(), in-memory cache, fallback=English
- [x] `backend/app/routers/translate.py` — `POST /translate`, no audit event (display transform)
- [x] `backend/app/main.py` — translate router registered
- [x] `frontend/lib/api.ts` — `translateText()` added (sole HTTP gateway, no direct Gemini calls)
- [x] `frontend/hooks/use-translated-content.ts` — manual-trigger hook, module-level cache, isFallback flag
- [x] `cases/[id]/summary/page.tsx` — "Translate Summary" button + fallback indicator wired in

### Tier 3 — Already built (no changes)
- [x] Ingestion pipeline already translates Hindi/Gujarati/English → English for AI reasoning

### Architecture compliance
- [x] No audit events for translation (deliberate: display transform, not mutation)
- [x] Translated text never written to DB — authoritative English always the source
- [x] No Redis, no new DB tables, no Celery — in-memory cache only
- [x] All Gemini calls through `gemini_client.py` only
- [x] All prompts as named constants in `prompts.py`
- [x] Fallback always returns original English — demo cannot die


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

### 10D Post-review note (2026-07-18)
- Functional build/import checks passed, but `CODE_REVIEW.md` found security,
  shared-boundary, API-contract, router-convention, and UI-token debt in the
  Phase 10 ports. The 10D integration checkbox records feature integration;
  Phase 11 below is required before calling the code review closed or treating
  the demo as ship-ready.

## Phase 11 — Code Review Conformance & Demo Hardening
Planning source: `CODE_REVIEW.md` generated 2026-07-18. No implementation has
been performed for this phase yet.

### 11A — Security and API contract
- [x] Authenticate video status and report reads and enforce accessible-case ownership
- [x] Move video routes to the flat `/video` contract and update typed client paths
- [x] Replace `celery_state` with provider-neutral processing states across API/UI
- [x] Make video handlers async and remove router-level exception remapping drift
- [x] ✅ CHECKPOINT: unauthenticated video reads fail safely and the new contract works

### 11B — Shared AI, audit, and provenance boundaries
- [x] Route all video Gemini work through `gemini_client.py` with retry/cache/logging
- [x] Move the video forensic prompt into named `prompts.py` constants
- [x] Route chain-of-custody audit writes through `audit_service.record(...)` with actor identity
- [x] Replace MD5 content fingerprints with SHA-256 throughout the video workflow
- [x] ✅ CHECKPOINT: video fallback, provenance, actor-attributed audit, and chain verification pass
  - Re-verified in 11D: deterministic fallback validates against `IncidentReport`,
    provenance recorded in `ai_tags`, audit events carry actor `user_id`, SHA-256
    chain append/verify passes and detects tampering.

### 11C — Frontend conformance and feedback states
- [x] Replace raw palette/hex/shadow values in the flagged Phase 10 surfaces with UI tokens
- [x] Replace `catch (err: any)` with `unknown`-safe error narrowing
- [x] Replace request/CCTNS browser alerts with toast or `<Alert>` feedback
- [x] Preserve video loading, failure, responsive, and reduced-motion states under the new contract
- [x] ✅ CHECKPOINT: targeted UI passes token, strict-TypeScript, and no-browser-alert audits
  - Verified 2026-07-18: targeted static audit clean; local `tsc --noEmit` clean; `next build` clean.

### 11D — Verification and handoff
- [x] Run static boundary audits for Gemini imports, audit writes, prompts, auth, async routers, and Celery terminology
- [x] Run frontend build/type checks and verify all HTTP remains behind `lib/api.ts`
- [x] Confirm or perform the still-open Phase 6 five-minute fresh-seed rehearsal
- [x] Rehearse the golden path plus authenticated video upload → report → timeline seek from a fresh seed
- [x] Verify unauthenticated, inaccessible, Gemini-failure, invalid-file, oversized-file, and UI mutation-failure cases
- [x] ✅ CHECKPOINT: all `CODE_REVIEW.md` findings are closed or explicitly documented
  - Verified 2026-07-18. Static audits: only `gemini_client.py` imports google-genai;
    no `AuditEvent(...)` construction outside the model (`LedgerService` routes through
    `audit_service.record()` with actor `user_id`); `VIDEO_FORENSIC_ANALYSIS_PROMPT` is a
    named constant; both video reads require `get_current_user` + `_ensure_case_access`;
    video routers are `async`; no Celery vocabulary; SHA-256 end to end; flat `/video`
    prefix. Build: `tsc --noEmit` clean, `next build` clean (14 routes), `import app.main`
    OK. All frontend HTTP behind `lib/api.ts` (only two `fetch` calls, both in `api.ts`).
    Negative cases (TestClient, 7/7): unauth status/report → 401, authed-missing → 404,
    unsupported ext → 415, spoofed .mp4 signature → 415, missing case → 404, malformed
    case_id → 400. Access guard (unit): cross-owner IO → 403, owner IO / SHO allowed,
    missing case → 404. Deterministic fallback validates against `IncidentReport`.
    Chain of custody: time-separated append→verify passes, tamper detected, actor
    attributed. Also fixed `/api/v1/video` → `/video` doc drift in `DEMO_SCRIPT.md` and
    `memory.md`. Golden-path + video live rehearsal confirmed by user.

## Phase 12 — Multilingual Support Integration
Planning source: `context/multilingual_merge_plan.md` (2026-07-28). Ported the
i18n infrastructure from `origin/manan/multilingual` via cherry-pick (NOT a raw
merge — the branch predates Phase 8–11 and uses an older flat route structure).

- [x] Extract 9 new i18n files (frontend dictionaries, language context, toggle, translated-text-block, hook; backend translate router + service) from `origin/manan/multilingual`
- [x] Port 2 missing dependencies the extracted files needed: `TRANSLATION_PROMPT` in `prompts.py`, `translateText()` + `TranslateOut` in `lib/api.ts`
- [x] Wire `LanguageProvider` into `frontend/app/layout.tsx`
- [x] Add `<LanguageToggle>` to `frontend/app/(authenticated)/layout.tsx` topbar
- [x] Register `translate.router` in `backend/app/main.py`
- [x] ✅ CHECKPOINT: `import app.main` OK (translate wired); `tsc --noEmit` clean; `next build` clean (14 routes)
  - Verified 2026-07-28. Backend: all routers import incl. translate. Frontend:
    tsc exit 0, next build exit 0. NOTE: Phase 8–11 UI strings not yet keyed in
    en/hi/gu dictionaries — they render English via `useT()` fallback until a
    follow-up pass adds their keys (documented in merge plan as out-of-scope).

## Phase 13 — End-to-End Audit & Remediation (COMPLETED 2026-08-06)
Planning source: `context/END_TO_END_TESTING_REPORT.md` (2026-08-06). Multi-agent audit and full systemic remediation across 14 frontend routes & 19 FastAPI routers.

- [x] 13.1 Fix hardcoded localhost API URL in `responses/page.tsx` and export `API_URL` constant from `lib/api.ts`
- [x] 13.2 Fix premature Dispatch button enablement in `requests/page.tsx` by using `!readinessMap[req.id]?.is_ready`
- [x] 13.3 Refactor ingestion and evidence file upload routers to stream files directly to disk (`shutil.copyfileobj`) to eliminate memory exhaustion (OOM) risks
- [x] 13.4 Refactor tab sub-route matching in `layout.tsx` to extract sub-route segment using case ID split
- [x] 13.5 Convert section status update endpoint to RESTful JSON payload body using `SectionStatusUpdateIn` schema
- [x] 13.6 Add Pydantic `Field(..., min_length=10)` validation constraints to `LegalRequestUpdateIn` schema
- [x] 13.7 Add `AbortController` cancellation and unmount cleanup to search debouncing in `cases/page.tsx`
- [x] 13.8 Implement robust numeric FIR suffix extraction in `mock_cctns.py`
- [x] ✅ CHECKPOINT: Full system verification passed — Next.js build (`next build`) and Python compilation (`python -m compileall app`) pass with zero errors.

## Phase 14 — Full Localization (UI + AI Voice) — COMPLETED 2026-08-08
Planning source: `context/i18n_full_localization_plan.md`. Closes the gap Phase 12
left open: the selected language now governs **everything**, including the
copilot's spoken language.

Root defects (all fixed): copilot had no `lang` input and always answered English;
hardcoded `"English / हिंदी"` labels leaked Hindi into a Gujarati session (the
reported bug); 17 components never called `t()`; dictionaries covered only Phase
1–7 sections; status enums, dates and numbers were unlocalized; Tier-2 AI
translation was inconsistent.

### 14A — Language plumbing
- [x] `setActiveLang()` in `lib/api.ts` + `X-Lang` header on the shared `request()` wrapper
- [x] `LanguageProvider` sets `documentElement.lang` / `data-lang` and warns on missing keys in dev
- [x] `[data-lang]` Indic body-font rules in `app/globals.css`
- [x] New `lib/format.ts` (locale-aware date/time/number) and `lib/i18n/enums.ts` (enum → key)
- [x] `get_lang()` FastAPI dependency in `backend/app/dependencies.py`

### 14B — Dictionary expansion
- [x] Add `copilot`, `notifications`, `osint`, `video`, `evidence_workspace`, `workflow`, `status`, `roles`, `readiness`, `revisions`, `citations`, `entity`, `shell` sections to `en.ts`
- [x] Extend `common` and `command_center` with the missing leaves
- [x] Mirror every new key into `hi.ts` and `gu.ts` — **709 keys × 3 languages, exact parity, zero English leftovers** (only `IMEI`/`URL` intentionally identical)

### 14C — Component sweep
- [x] Key the components that never called `t()` (`notifications-popover`, `osint-enrichment-panel`, `video-evidence-workspace`, `evidence-review-workspace`, `status-badge`, `workflow-spine`, `citation-dialog`, `request-readiness-checklist`, `entity-review-field`, `ai-content-card`, `processing-card`, `path-revision-list`, `language-toggle`, `ui/dialog`, plus 8 route pages and the app shell)
- [x] Remove all hardcoded bilingual `"English / हिंदी"` concatenations
- [x] Replace hardcoded `"en-IN"` locale literals with `lib/format.ts` helpers (11 sites)
- [x] Localize `aria-label`, `title`, and `placeholder` attributes
- [x] New `lib/i18n/endonyms.ts` — the single sanctioned home for native language names, so the audit can forbid Indic literals everywhere else

### 14D — Copilot speaks the selected language (headline fix)
- [x] `lang` + optional canonical `intent` on `CopilotAskIn`; intent-based prompt routing replaces English keyword sniffing
- [x] `answer_localized` on the Gemini structured schema — one call returns authoritative English + localized display text
- [x] Output-language instruction + do-not-translate identifier list in `COPILOT_SYSTEM_PROMPT`
- [x] `COPILOT_FALLBACKS` (6 intents × 3 langs) so Gemini outages still answer in the selected language
- [x] Alembic migration `c3d4e5f6a7b8`: `copilot_messages.message_localized` (nullable) + `lang` (default `"en"`) — applied to the dev database
- [x] `copilot-panel.tsx` fully keyed: header, chips (send `intent`), placeholder, loading/error, citation source labels, timestamps

### 14E — Tier-2 auto-translation consistency
- [x] `TranslatedTextBlock` defaults to `autoTranslate`; manual button retained only for the verbatim raw-complaint pane
- [x] Auto-translate the missed surfaces (`responses/page.tsx` `ai_insights`, command-center AI summary, summary page)
- [x] `POST /translate/batch` (25-item cap) + durable `fallback_cache` read/write-through in `translate_service`
- [x] Per-tick request coalescer in `use-translated-content.ts` — a page of AI blocks makes **one** HTTP call, not N

### 14F — Verification
- [x] `frontend/scripts/i18n-audit.mjs` (`npm run i18n:audit`) — key parity, no untranslated values, no Indic literals outside `lib/i18n/`, no hardcoded locales. Also added `npm run verify` (audit + tsc + build).
- [x] `tsc --noEmit` clean; `next build` clean (14 routes); `python -m compileall app` clean; `import app.main` OK; migration applied and `alembic current` at head
- [x] ✅ CHECKPOINT PASSED — verified live against the running backend with seeded Case 1:
  - `X-Lang: en` → answer in Latin script, `lang="en"`
  - `X-Lang: hi` → answer in **Devanagari**, `lang="hi"`
  - `X-Lang: gu` → answer in **Gujarati script**, `lang="gu"`
  - `message_en` always carries the authoritative English for the audit trail
  - Chat history replays each message in the language it was generated for (`langs persisted: ['en','gu','hi']`)
  - Legal identifiers preserved verbatim through translation: `"Section 94 of BNSS હેઠળ કાનૂની નોટિસ મોકલો."` — BNSS and the IP `103.88.22.14` survive intact
  - `POST /translate/batch` returns per-item results (`मामले का सारांश`, `कानूनी आधार`)

**Known gaps (pre-existing, not introduced by Phase 14):** the repo has no ESLint
config (`next lint` prompts for setup) and no pytest suite, so neither could be
run as a gate. The manual 14-route × 3-language click-through has not been
performed — the automated audit covers key parity and literal leakage, but a
human pass is still worth doing before the demo.

## Phase 15: Surat City Heatmap (Bonus) — COMPLETED
- [x] Create `app/(authenticated)/heatmap/page.tsx` with Custom Canvas implementation
- [x] Integrate realistic Surat Police Zone risk data (`SURAT_ZONES`)
- [x] Implement token-compliant Ferrari Command Center UI elements (dark-mode, squircle corners)
- [x] Add time-range and crime-type filters
- [x] Add dynamic layout features (Metrics Strip, interactive cluster cards, interactive zone table)
- [x] Add English (`en.ts`), Hindi (`hi.ts`), and Gujarati (`gu.ts`) i18n keys for heatmap content
- [x] Register Heatmap link in sidebar navigation `layout.tsx`
- [x] Update `ui_registry.md` with new `HeatmapPage` and `HeatmapCanvas`
- [x] Verified build cleanly passes `tsc --noEmit`

## Phase 16: Real-Time Alert Center (Bonus) — COMPLETED
- [x] Create `app/(authenticated)/alert-center/page.tsx` route & page layout
- [x] Build Alert Center dashboard with dynamic KPI cards & channel badges
- [x] Implement `AlertCard` with interactive mark-as-read toggling and dismiss removal transitions
- [x] Implement severity filtering (ALL, CRITICAL, HIGH, MEDIUM, LOW)
- [x] Register "Alert Center" link in sidebar layout with `!` red exclamation badge
- [x] Add i18n keys to English (`en.ts`), Hindi (`hi.ts`), and Gujarati (`gu.ts`)
- [x] Update `context/ui_registry.md` with `AlertCenterPage`, `AlertCard`, and `KpiCard`

## Phase 17: Repeat Offender Intelligence (Bonus) — COMPLETED
- [x] Create `app/(authenticated)/repeat-offenders/page.tsx` route & page layout
- [x] Create `lib/repeatOffendersData.ts` with 15 detailed mock offender profiles, recidivism scores, risk levels, total cases, active locations, and crime timelines
- [x] Implement Master-Detail layout with "OFFENDER REGISTRY" data table and "BEHAVIORAL PROFILE" inspector panel
- [x] Implement risk level filter dropdown ("All Risk Levels", "CRITICAL", "HIGH", "MEDIUM", "LOW")
- [x] Implement row-selection state with blue backdrop highlight and active profile inspector updates
- [x] Implement risk level status badges/pills with Ferrari design token dark-mode styling
- [x] Register "Repeat Offenders" link with profile-card icon (`UserCheck`) in global sidebar navigation `layout.tsx`
- [x] Add i18n keys to English (`en.ts`), Hindi (`hi.ts`), and Gujarati (`gu.ts`)
- [x] Verified `npm run verify` (`i18n:audit`, `tsc --noEmit`) passes with zero errors

## Phase 18: Criminal Network Intelligence (Bonus) — COMPLETED
- [x] Installed `d3` and `@types/d3` in main project frontend
- [x] Create `lib/criminalNetworkData.ts` with 24 nodes, 41 edges, 8 gang communities matching reference KPI values
- [x] Create `components/criminal-network-graph.tsx` — D3 force-directed graph with drag/zoom/pan, pulsing rings on CRITICAL nodes, click-to-select, color-coded edge types (gang=red, financial=amber, comms=blue)
- [x] Create `app/(authenticated)/criminal-network/page.tsx` — standalone route with KPI strip, force graph + node profile panel + central influencers, gang structures grid, and graph legend
- [x] Used Next.js `dynamic()` with `ssr: false` for the D3 graph component (client-only)
- [x] Register "Criminal Network" link with `Network` icon in global sidebar navigation `layout.tsx`
- [x] Add breadcrumb entry for `/criminal-network` in layout
- [x] Add i18n keys to English (`en.ts`), Hindi (`hi.ts`), and Gujarati (`gu.ts`)
- [x] Verified `tsc --noEmit` passes with zero errors

## Phase 19: AI Crime Heatmap Engine Porting — COMPLETED
- [x] Replaced existing MapLibre/Deck.gl heatmap page with modular SVG rendering engine matching `exploration/crimeos-ai` reference
- [x] Created `lib/heatmapData.ts` providing 359 points, 8 risk zones (Alpha District, Beta Sector, Theta Ward, etc.), and 8 active crime clusters
- [x] Created `components/heatmap/HeatmapCanvas.tsx` for two-tier rendering (glowing micro-scatter dots background layer + concentric glassmorphic cluster rings foreground layer)
- [x] Created `components/heatmap/ClusterRing.tsx` for concentric risk rings with animated pulse effects
- [x] Created `components/heatmap/ClusterCard.tsx` for 7-day trend sparklines and active hotspot cards
- [x] Restored exact KPI header bar (Total Points: 359, Critical: 0, High Risk: 1, Active Clusters: 8), floating risk legend card, and `28.353° N - 23.887° N` coordinate indicator
- [x] Added `/crime-heatmap` route alias alongside `/heatmap` in `layout.tsx` navigation and breadcrumbs
- [x] Wired `getHeatmapPoints`, `getHeatmapZones`, `getHeatmapClusters` through `lib/api.ts` with offline fallback


