# Review — Crime OS AI (Whole Codebase)

_Generated: 2026-07-18_

Benchmark established from `context/project_overview.md`, `architecture.md`, `code_standards.md`, `DESIGN.md`, and the progress tracker (through Phase 10D). The golden path and Phase 1–9 code are mature and largely conform. Findings concentrate in the **Phase 10 upstream-integrated features** (video, OSINT, timeline), where ported code drifted from the project's established conventions.

Verified build claims: `tsc --noEmit` passes clean, and `import app.main` succeeds. Those two checkpoints hold.

---

## Layer 1 — Plan alignment

**PASS (with one note)**

The golden path and all planned phases are present. Every functional requirement from the problem statement maps to real code: multimodal ingestion, SOP-grounded paths, legal request dispatch, analytics, summaries, audit trail, plus all three bonuses (RBAC, mock CCTNS, evidence tagging). Phase 8 intelligence and Phase 10 upstream features (timeline, OSINT, video) are all wired into `main.py` and the UI.

- **Minor** — `context/progress_tracker.md:53` — Phase 6 demo checkpoint ("5-min demo rehearsed twice from fresh seed") is still `[ ]` unchecked while everything downstream is marked done. Either stale or a genuinely unmet checkpoint. Worth confirming before demo day.

---

## Layer 2 — System integrity

**ISSUES FOUND** — this is where the Phase 10 drift lives.

### Critical

- `backend/app/services/video_service.py:271-272` — `from google import genai` / `from google.genai import types` imported directly in a service. Violates Architectural Rule 2 ("`gemini_client.py` is the ONLY file that imports google-genai"). Every other AI feature (timeline, extraction, path, copilot) routes through `gemini_client.py`. Video analysis bypasses the gateway entirely — no shared retry/backoff, no fallback-cache, no unified logging. It has its own try/except deterministic fallback (`video_service.py:343-345`), so the demo won't die, but it's a parallel AI path.

- `backend/app/services/video_service.py:26-112` — `LedgerService` writes directly to the `AuditEvent` table with its own hashing scheme, bypassing `audit_service.record()` (Rule 4 / code_standards "every state-changing service function ends with `audit_service.record`"). It also writes **without `user_id`** (the model allows null, but every other writer passes the acting user). This creates a second audit-writing path with inconsistent event shape (`detail.payload` + `ledger_hash` vs the flat `detail` dict everyone else uses).

- `backend/app/services/video_service.py:324-329` — the forensic-analysis prompt is inlined as a string literal in the service. Violates Rule 3 ("All prompts in `prompts.py` as named constants"). Every other prompt lives in `prompts.py`.

### Important

- `backend/app/routers/video.py:21` — router uses prefix `/api/v1/video`, breaking the flat convention every other router follows (`/paths`, `/evidence`, `/copilot`, `/cases/{id}/osint`). Inconsistent API surface.
- `backend/app/routers/video.py:175,209` — `get_status` and `get_report` are declared `def` (sync) instead of `async def`. code_standards: "routers are `async def`".
- `backend/app/routers/video.py:189-202` — response schema exposes `celery_state` ("PROGRESS"/"SUCCESS"/"FAILURE") to mimic Celery states, even though the architecture explicitly bans Celery/Redis. Leftover shape from the upstream source; harmless functionally but misleading naming in a codebase that prides itself on not having Celery.
- `backend/app/routers/evidence.py:30-48, 70-89, 99-114, 124-139` — four handlers wrap service calls in `try/except` and re-map to `HTTPException`. code_standards: "Routers do NOT try/except" — the global `AppError` handler in `exceptions.py:34` already does this mapping. `video.py:49-52,116-122` and `ingestion.py:157-165` have the same pattern. (`paths.py`, `command_center.py` also catch `ValueError` for 404s — a lighter version of the same drift.)
- Frontend design-system drift — raw Tailwind palette colors and hardcoded hex instead of semantic tokens (Hard Rule 1, DESIGN.md). Concentrated in Phase 10 components:
  - `components/evidence-review-workspace.tsx` — ~40 raw palette uses (`bg-slate-900`, `text-emerald-400`, `text-amber-400`, etc.)
  - `components/osint-enrichment-panel.tsx` — ~19, including `bg-[#141414]`, `bg-[#161616]`
  - `components/video-evidence-workspace.tsx:209-220` — `bg-red-500/10`, `bg-amber-500/10`, `shadow-[0_0_8px_#f87171]` etc. The design system defines `success`/`warn`/`danger` tokens for exactly this.
  - `components/entity-pivot-panel.tsx` — ~10 (`bg-slate-900`, `text-emerald-400`, `bg-[#0f0f0f]`)
  - `components/path-stepper.tsx:18-21,49` — hardcoded hex (`bg-[#1a0a0a]`, `#dc0000` in gradient)
  - `app/(authenticated)/cases/[id]/summary/page.tsx` — 6 hardcoded hex values
- `components/osint-enrichment-panel.tsx:54,125,146,158,170` and `response-correlation-panel.tsx:32` — `catch (err: any)` violates `strict: true` / "No `any`" (code_standards). Use `unknown` + narrowing like the rest of the codebase.

### Minor

- `backend/app/routers/video.py:77,124` — MD5 for the chain-of-custody "original_md5". MD5 is fine as a non-security content fingerprint, but in a feature literally branded "tamper-evident chain of custody," SHA-256 (already imported) would be more defensible.

---

## Layer 3 — Production readiness

**ISSUES FOUND**

### Critical

- `backend/app/routers/video.py:174-175, 208-209` — `GET /api/v1/video/status/{task_id}` and `GET /api/v1/video/report/{case_id}` have **no `get_current_user` dependency**. Every other read endpoint in the app requires auth. These leak video analysis status and full forensic reports (summary, crime summary, detected entities, timeline, chain-of-custody) to any unauthenticated caller who has a UUID. The tracker's 10D note claims "every Phase 10 router uses `get_current_user`" — that audit missed these two handlers.

### Important

- Frontend `alert()` for product feedback — violates "no browser `alert()`" (code_standards, ui_rules). Found in:
  - `app/(authenticated)/cases/[id]/requests/page.tsx:163,176,189,203` — dispatch/approve/update failures
  - `app/(authenticated)/cases/[id]/layout.tsx:93` — CCTNS sync failure

  These are on golden-path surfaces (legal requests, sync), so a real failure shows a raw browser dialog instead of the toast/`<Alert>` pattern used elsewhere.

### Minor

- `backend/app/services/video_service.py:274` — `client.files.upload` + polling loop (`max_wait = 180s`) runs in a `BackgroundTasks` worker. If Gemini hangs near the ceiling, the background thread is tied up for up to 3 minutes. Acceptable for a demo, but worth knowing under load.

---

## Summary

**~15 issues found across 3 layers.** The Phase 1–9 core (golden path, intelligence, design system) is in good shape and the two build checkpoints pass. The concentration is unmistakable: the Phase 10 upstream ports (video especially, then OSINT) were integrated *functionally* but not *conformed* to the project's own architecture — direct genai import, parallel audit ledger, inlined prompt, non-standard router prefix, two unauthenticated endpoints, and the bulk of the design-token drift all trace to that work.

### Triage recommendation

1. **Fix before demo/ship:** the two unauthenticated video endpoints (`video.py:174,208`) — a real security gap, one-line fix each.
2. **Fix soon:** video_service's genai import + LedgerService + inlined prompt (route through `gemini_client.py`, `audit_service`, `prompts.py`); replace `alert()` on the requests/sync surfaces; the `any` catches.
3. **Fix when convenient:** design-token drift in the five Phase 10 components; router `try/except` cleanup; async router handlers; `/api/v1/video` prefix.

Nothing here breaks the golden path today. Every video AI failure falls back deterministically, secrets are correctly gitignored, RBAC on dispatch/approval is solid, and provenance/citations are honored across the original features. The debt is Phase 10 conformance, not correctness of the core.
