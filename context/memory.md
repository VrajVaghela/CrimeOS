# Memory — Phase 14 Full Localization Implemented

Last updated: 2026-08-08

## Latest Update — Phase 14 Full Localization IMPLEMENTED (2026-08-08)

All six work packages (14A–14F) landed. The reported bug is fixed: selecting
Gujarati now makes the whole UI **and the copilot's answers** Gujarati.

What shipped:
- **Copilot speaks the selected language.** One Gemini call returns `answer`
  (English, authoritative → `copilot_messages.message_en`) plus
  `answer_localized` (display → `message_localized`, with `lang`). Migration
  `c3d4e5f6a7b8` applied. Verified live: `X-Lang: gu` → Gujarati script,
  `hi` → Devanagari, `en` → Latin; legal identifiers (`Section 94 of BNSS`,
  IP `103.88.22.14`) survive translation verbatim. History replays each message
  in the language it was generated for.
- **Language travels via an `X-Lang` header** (`setActiveLang()` in `lib/api.ts`
  → `get_lang()` FastAPI dependency). No per-call-site plumbing.
- **Canonical `intent`** on `CopilotAskIn` replaced English keyword sniffing, so
  Gujarati/Hindi free text routes correctly. 6 intents × 3 langs of localized
  deterministic fallbacks keep a Gemini outage answering in the right language.
- **709 keys × 3 languages, exact parity, zero untranslated values.** New
  sections: copilot, notifications, osint, video, evidence_workspace, workflow,
  status, roles, readiness, revisions, citations, entity, shell.
- **All hardcoded `"English / हिंदी"` pairs removed** — that concatenation was the
  screenshot bug. Native language names now live only in `lib/i18n/endonyms.ts`,
  which lets the audit forbid Indic literals in `.tsx` outright.
- **Tier-2 auto-translation is now the default.** `TranslatedTextBlock`
  auto-translates; the manual button survives only on the verbatim raw-complaint
  pane. `POST /translate/batch` + durable `fallback_cache` read/write-through.
  A per-tick coalescer in `use-translated-content.ts` collapses a page of AI
  blocks into one HTTP call (chosen over the planned `useTranslatedContents`
  because it needs no call-site changes).
- **Guardrail:** `npm run i18n:audit` checks key parity, untranslated values,
  Indic literals outside `lib/i18n/`, and hardcoded locales. `npm run verify`
  chains audit + tsc + build.

Verified: `i18n:audit` passes, `tsc --noEmit` clean, `next build` clean (14
routes), `python -m compileall app` clean, `import app.main` OK, `alembic
current` at head.

Known gaps: repo has no ESLint config and no pytest suite, so neither could gate
this (both pre-existing). The manual 14-route × 3-language click-through has not
been done — worth a human pass before the demo.

## Planning record — Phase 14 (2026-08-07)

User report: selecting Gujarati still shows Hindi labels and the AI copilot always
answers in English. Requirement: the selected language must govern **everything**,
including the assistant's voice.

Audit findings (12 defects, all verified in code — see
`context/i18n_full_localization_plan.md` for the table with file:line evidence):
- `copilot_service.ask_copilot()` takes no `lang`; no copilot prompt states an output language.
- 9 hardcoded `"English / हिंदी"` concatenations (copilot panel header/sources,
  command center, entity pivot, evidence workspace, path revisions, cases page,
  evidence page) — Hindi leaks into Gujarati sessions. This is the screenshot bug.
- 17 components never call `t()`; dictionaries only cover Phase 1–7 sections.
- `hi.ts`/`gu.ts` ARE key-complete against `en.ts` today — the gap is missing
  sections for Phase 8–13 UI, not missing translations.
- `status-badge` renders raw DB enums; several files hardcode the `en-IN` locale;
  `<html lang>` is static and the body font never switches to an Indic face.
- Tier-2 AI translation is inconsistent (`autoTranslate` set on some blocks only).
- Translate cache is process-memory only; `fallback_cache` table exists but is unused.
- English keyword routing in the copilot breaks for Hindi/Gujarati free text.

Key design decisions:
- **Three tiers**: static UI → dictionaries; stored AI artifacts → display-time
  `/translate`; conversational copilot → generated directly in the target language.
- **One Gemini call returns both** `answer` (English, authoritative → audit +
  `copilot_messages.message`) and `answer_localized` (display → new
  `message_localized` + `lang` columns). English stays authoritative in the DB.
- **Language travels via an `X-Lang` header** set from `lib/api.ts`, read by a
  `get_lang()` dependency — no per-call-site plumbing.
- **Canonical `intent` param** replaces English keyword sniffing so Gujarati/Hindi
  free text routes correctly.
- **Localized deterministic fallbacks** so a Gemini outage still answers in Gujarati.
- `ui_rules.md` rule 7 was rewritten: the old "Bilingual Labels" rule is what caused
  the bug and is now an explicit prohibition.

Work breakdown: 14A plumbing → 14B dictionaries → (14C component sweep ∥ 14D copilot)
→ 14E Tier-2 consistency → 14F verification incl. a new `npm run i18n:audit` guardrail.

Status: superseded — implemented 2026-08-08, see the section above. Docs:
`context/i18n_full_localization_plan.md`, Phase 14 in `progress_tracker.md`,
rule 7 in `ui_rules.md`.

## Previous — Phase 13 End-to-End Audit & Remediation (2026-08-06)
- **Hardcoded Localhost API Download URL**: Exported `API_URL` from `lib/api.ts` and replaced hardcoded `http://localhost:8000` download link in `responses/page.tsx`.
- **Premature Dispatch Button Enablement**: Fixed readiness condition in `requests/page.tsx` using `!readinessMap[req.id]?.is_ready`.
- **RAM Exhaustion on Ingestion & Evidence Uploads**: Refactored `ingestion.py`, `evidence.py`, `ingestion_service.py`, and `evidence_service.py` to stream files directly to disk using `shutil.copyfileobj`.
- **Brittle Active Tab Matching**: Updated `layout.tsx` to extract sub-route segments using exact case ID splitting (`pathname.split('/cases/${caseId}')[1]`).
- **Non-RESTful State Mutator Query Parameters**: Converted `PATCH /paths/sections/{section_id}/status` to accept a proper JSON request body (`SectionStatusUpdateIn`).
- **Missing Validation on Legal Request Draft Edits**: Added Pydantic `Field(..., min_length=10)` validation to `LegalRequestUpdateIn`.
- **Dangling Search Debounce Promises**: Added `AbortController` request cancellation and unmount cleanup to `cases/page.tsx`.
- **Fragile Mock CCTNS FIR Number Parsing**: Refactored FIR number generation in `mock_cctns.py` using regex numeric extraction.
- **Verification**: `next build` compiled 14 static/dynamic routes cleanly with zero errors, and `python -m compileall app` passed cleanly.

**Phase 10D — Integration Verification and Handoff.** All tasks completed:

1. **Frontend build verified** — `npx next build` compiled 14 routes cleanly with zero errors.
   - Routes: `/`, `/_not-found`, `/cases`, `/cases/[id]`, `/cases/[id]/audit`, `/cases/[id]/evidence`, `/cases/[id]/ingestion`, `/cases/[id]/path`, `/cases/[id]/requests`, `/cases/[id]/responses`, `/cases/[id]/summary`, `/cases/[id]/timeline`, `/dashboard`, `/login`

2. **TypeScript clean** — `npx tsc --noEmit` produced zero errors.

3. **Backend imports clean** — `python -c "import app.main; print('ok')"` succeeded.

4. **Raw fetch() audit** — All `fetch()` calls are inside `lib/api.ts` only (the generic `request()` wrapper and the OSINT dossier `exportDossier()` function). Zero raw fetches in page components.

5. **Phase 10 seed data added** (`backend/app/seeds/run.py`):
   - 6 timeline events for Case 2: complaint_filed, entity_extracted, request_dispatched, response_received, officer_note, cctv_frame (with CCTV analysis payload)
   - 1 seeded CCTV evidence image fixture for the CCTV timeline event
   - 1 seeded video evidence record (COMPLETED status, 3 timestamped events) so the VideoEvidenceWorkspace report is demonstrable from fresh seed without uploading a real MP4

6. **DEMO_SCRIPT.md updated** — Added Part 10 with:
   - 10A: Timeline Agent & CCTV Pinning walkthrough
   - 10B: OSINT Digital Footprint Enrichment walkthrough
   - 10C: Video Evidence Analysis walkthrough
   - Fresh-seed smoke test checklist (11 checks)

7. **progress_tracker.md updated** — 10D marked `[x]` with full verification summary.

8. **ui_registry.md** — Phase 10 components already marked BUILT in previous sessions (TimelineWorkspace, OsintEnrichmentPanel, VideoEvidenceWorkspace).

## Decisions made

- Phase 10D does NOT modify any source code — it is a verification + docs phase only.
- Video evidence seeded as a static `ai_tags` fixture (COMPLETED state); no actual MP4 file is expected in `uploads/` for the seed, but the report view renders from `ai_tags` data.
- The CCTV timeline event references a seeded `evidence_files` record (`file_path="uploads/evidence/demo_cctv_frame.jpg"`) — this file does not need to exist on disk since the frontend renders the event from timeline metadata, not the file.
- The seed `import` for `TimelineEvent` is done inline inside the `main()` function (not at module top) to avoid circular import risk — this is consistent with how `OsintScan` etc. were previously seeded.

## Problems solved

- None in 10D (it is a verification phase; all 10A/B/C implementations were done in previous sessions).
- Confirmed that `uploadVideo()` in `api.ts` correctly uses `/video/analyze` which matches the router prefix `prefix="/video"` in `backend/app/routers/video.py` (flattened from the old `/api/v1/video` in Phase 11A).
- Confirmed that both raw `fetch()` calls in `api.ts` are within the file (not in page components), satisfying the provenance rule.

## Current state

**All 10 phases complete.** The project is in a clean, demo-ready state:
- Fresh seed works: `python -m app.seeds.run` from `backend/`
- Frontend dev server: `npm run dev` from `frontend/`
- Backend dev server: `uvicorn app.main:app --reload` from `backend/`
- Golden path: Case 1 → Ingestion → Path → Requests → Responses → Summary → Audit
- Phase 10 intelligence: Case 2 → Timeline + OSINT + Video

## Next session starts with

**Implement Phase 14** per `context/i18n_full_localization_plan.md`, in order:
14A plumbing → 14B dictionaries (`copilot` section first) → 14D copilot localization
(the user's stated priority) → 14C component sweep → 14E → 14F.

If continuing demo work instead:
- Run `python -m app.seeds.run` from `backend/` to reset seed
- Run both servers and rehearse the golden path + intelligence moments per `DEMO_SCRIPT.md`
- If any Phase 10 component is missing from the UI (unlikely), check `frontend/components/` for `timeline-workspace.tsx`, `osint-enrichment-panel.tsx`, and `video-evidence-workspace.tsx`

## Open questions

None. Phase 10D checkpoint has passed.
