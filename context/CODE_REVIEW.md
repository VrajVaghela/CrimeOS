# Review — Crime OS AI (Whole Codebase)

_Original: 2026-07-18 · Re-reviewed & updated: 2026-07-20_

This pass verified the status of every issue from the 2026-07-18 review and ran a fresh whole-project bug hunt (four parallel reviewers across backend services/AI, backend routers/models, and frontend). Build checkpoints re-confirmed: `tsc --noEmit` passes clean, `import app.main` succeeds.

**Headline:** The Phase-10 drift that dominated the last review has been comprehensively remediated (13 of 15 resolved). The new hunt surfaced a different, previously-missed cluster centered on the **OSINT router/service** and **cross-case data scoping** — including one guaranteed-500 endpoint and one cross-case data leak.

---

## Part A — Status of previous findings (2026-07-18)

| # | Issue | Status |
|---|-------|--------|
| 1 | `progress_tracker.md:53` Phase 6 demo checkpoint unchecked | ✅ **SOLVED** — now `[x]`, confirmed 2026-07-18 |
| 2 | `video_service.py` direct `from google import genai` (bypasses gateway) | ✅ **SOLVED** — routes through `gemini_client`; grep confirms only `gemini_client.py` imports google-genai |
| 3 | `LedgerService` bypasses `audit_service`, no `user_id` | ✅ **SOLVED** — `append_ledger_event` calls `audit_service.record(...)` and passes `user_id` |
| 4 | Inlined forensic prompt in service | ✅ **SOLVED** — now `VIDEO_FORENSIC_ANALYSIS_PROMPT` in `prompts.py:201` |
| 5 | `video.py` prefix `/api/v1/video` breaks flat convention | ✅ **SOLVED** — `APIRouter(prefix="/video")` |
| 6 | `get_status`/`get_report` declared `def` not `async def` | ✅ **SOLVED** — both `async def` |
| 7 | `celery_state` leaked in response schema | ✅ **SOLVED** — replaced with `processing_state: ProcessingState` |
| 8 | Routers try/except → HTTPException remap | ⚠️ **PARTIAL** — cleaned in `evidence.py` & `ingestion.py`; still present in `video.py` upload handler (input/file-write validation, not a service remap) |
| 9 | Frontend design-token drift (raw palette/hex) in flagged Phase-10 files | ✅ **SOLVED** — no raw hex in the six flagged files. (New drift found elsewhere — see B-8) |
| 10 | `catch (err: any)` in OSINT/correlation panels | ✅ **SOLVED** — all now `catch (err: unknown)` |
| 11 | MD5 for `original_md5` chain-of-custody | ✅ **SOLVED** — now SHA-256 (`original_sha256`) |
| 12 | Unauthenticated video status/report endpoints | ✅ **SOLVED** — both require `get_current_user` + `_ensure_case_access` |
| 13 | Frontend `alert()` on requests/layout surfaces | ✅ **SOLVED** — no `alert(` in those files |
| 14 | `files.upload` 180s polling loop in BackgroundTasks | 🔵 **BY DESIGN** — still present; was a "worth knowing under load" note, not a defect |

**13 solved · 1 partial (#8) · 1 by-design (#14).**

---

## Part B — New findings (2026-07-20)

### CRITICAL

#### B-1. `NameError` crash — `datetime` never imported in OSINT router
- **File**: `backend/app/routers/osint.py:192` (imports at `:1-9`)
- **Context**: The module imports only `uuid`, FastAPI symbols, and models — there is no `from datetime import datetime`. Line 192 calls `datetime.utcnow()`:
  ```python
  filename = f"dossier_{entity_id}_{int(datetime.utcnow().timestamp())}.txt"
  ```
  Any call to `GET /cases/{case_id}/osint/{entity_id}/export` raises `NameError`. It is not an `AppError`, so the global handler does not catch it → unhandled 500. The export endpoint is completely non-functional.
- **Suggestion**:
```diff
- import uuid
+ import uuid
+ from datetime import datetime
```

#### B-2. Mock provider response endpoint has no auth and mutates state
- **File**: `backend/app/routers/mock_provider.py:12-18`
- **Context**: `POST /mock/provider/respond/{request_id}` depends only on `db` — no `get_current_user`/role check. It calls `analytics_service.generate_mock_response`, which flips the request to `RESPONDED`, writes a `ProviderResponse`, generates a path revision, and commits (`analytics_service.py:124-313`). Violates code_standards.md L20: "External-looking actions (dispatch, CCTNS sync, mock response trigger) require an explicit user action and role validation." Any unauthenticated caller can mutate case workflow state. The audit event is also written with `user_id=None`.
- **Suggestion**:
```diff
  async def trigger_mock_response(
      request_id: uuid.UUID,
+     current_user: User = Depends(get_current_user),
      db: Session = Depends(get_db)
  ) -> ProviderResponseOut:
```

### HIGH

#### B-3. OSINT background task reuses the request-scoped DB session
- **File**: `backend/app/routers/osint.py:65, 111` → `osint_service.run_osint_scan_task`
- **Context**: The router passes the `Depends(get_db)` yield-session into `background_tasks.add_task(osint_service.run_osint_scan_task, db, scan.id)`. `get_db` (`database.py:17-22`) closes that session during request teardown, but the background task runs *after* the response and calls `db.get(...)`/`db.commit()` on it (`osint_service.py:353-628`). Reusing a yield session in a background task is unsupported (FastAPI 0.115.6). Result: every router-triggered OSINT scan runs against a dead session → `DetachedInstanceError`/commit failure, scan stuck in PENDING/RUNNING, no error surfaced. `video_service.analyze_video_task` (`:227`) and `osint_service.trigger_scan_async` already do it right by opening their own `SessionLocal()`. *(Independently confirmed by two reviewers.)*
- **Suggestion**: Pass only `scan.id`; have the task open its own `SessionLocal()` (mirror `video_service`), or route through the existing `trigger_scan_async`.

#### B-4. Copilot context leaks provider responses across ALL cases
- **File**: `backend/app/services/copilot_service.py:108`
- **Context**:
  ```python
  provider_responses = db.scalars(
      select(ProviderResponse).where(ProviderResponse.legal_request_id != None)
  ).all()
  ```
  Not scoped by `case_id`. Every case's copilot answer is fed provider responses (parsed transaction/CDR data, AI insights) from *unrelated* cases — violating the case-scoping architecture rule, leaking sensitive data, and producing citations whose `source_id` points to out-of-case rows.
- **Suggestion**: Join through `LegalRequest.case_id == case_id`, matching `analytics_service.get_responses_by_case`.

#### B-5. Undefined Tailwind token `danger` renders no styles
- **File**: `frontend/components/osint-enrichment-panel.tsx:230, 380`; `frontend/app/(authenticated)/layout.tsx:212`
- **Context**: `tailwind.config.ts` defines `destructive` but has **no `danger` color key** (`--danger` exists only as a raw CSS var in `globals.css:29`, never wired into Tailwind). So `bg-danger`/`text-danger`/`border-danger` compile to nothing. A FAILED OSINT scan badge (`:230`) renders with no red styling — it looks invisible/unstyled instead of signaling failure. Same for the negative-delta indicator (`:380`) and logout hover (`layout.tsx:212`).
- **Suggestion**: Use the defined `destructive` token, which the same file already uses correctly (lines 186, 320-328):
```diff
- bg-danger/10 text-danger border-danger/30
+ bg-destructive/10 text-destructive border-destructive/30
```

#### B-6. Hardcoded API URL with no env fallback
- **File**: `frontend/app/(authenticated)/cases/[id]/responses/page.tsx:221`
- **Context**: `href={`http://localhost:8000/${selectedResponse.file_path}`}` — the "Download CSV" link is hardcoded to localhost, so it 404s in any deployed environment. The sibling `evidence/page.tsx:247` correctly uses `process.env.NEXT_PUBLIC_API_URL || ...`, making this an inconsistent regression.
- **Suggestion**: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/...`, or add an `exportResponseCsv` helper in `api.ts`.

### MEDIUM

#### B-7. OSINT audit events are never committed (lost audit trail)
- **Files**: `backend/app/routers/osint.py:67-79` (manual trigger) and `:159-174` (ignore-pivot); `backend/app/services/osint_service.py:665-676` (`enqueue_osint_scan`)
- **Context**: `enqueue_osint_scan` commits *before* calling `audit_service.record(...)`, and `audit_service.record` only does `db.add` (no commit — `audit_service.py:10-20`). The router then records another audit event and returns without committing; `get_db` does not commit. So `osint_scan_enqueued`, `osint_scan_triggered_manually`, and `osint_pivot_ignored` events are added to the session and then discarded on teardown. Violates "every state-changing function ends with `audit_service.record` before commit." *(Independently confirmed by two reviewers.)*
- **Suggestion**: Record the audit event *before* the commit, or add a trailing `db.commit()` after each `audit_service.record(...)`.

#### B-8. Case-number generation has a race / no collision handling
- **File**: `backend/app/routers/cases.py:67-68`
- **Context**: `count = db.scalar(select(func.count())...)` then `case_number = f"CASE-{year}{count+1:04d}"`. `case_number` is `unique=True` (`models/case.py:14`). Two concurrent `POST /cases` compute the same count → the second commit raises `IntegrityError` (not an `AppError`) → unhandled 500.
- **Suggestion**: Use a DB sequence, or catch `IntegrityError` and regenerate/return 409.

#### B-9. Video timeline `entities_detected` attached only to the first event
- **File**: `backend/app/services/video_service.py:378`
- **Context**: `report_data.get("entities_detected", []) if idx == 0 else []`. Detected entities are stored only on the first timeline marker; all later frames get an empty list even where the entity appears — misrepresenting provenance/locator for every non-first CCTV event.
- **Suggestion**: Attach the full list to each event, or map entities to the frames they actually appear in.

#### B-10. Timeline synthesis events emitted without full provenance payload
- **File**: `backend/app/services/timeline_service.py:71-82`
- **Context**: AI-generated `TimelineEvent`s carry `ai_generated=True` and a hardcoded `confidence=0.85`, but `source_ref={"type": "ai_synthesis"}` has no `source_id`/`excerpt`/`locator`. Violates the provenance standard ("source_type, source_id, excerpt/locator, and confidence"). The 0.85 is fabricated rather than model-derived, and events can't be traced to source.
- **Suggestion**: Propagate per-event source references from the synthesis output; use model-derived confidence.

#### B-11. `no-any` violations in shared types
- **File**: `frontend/lib/types.ts:142, 180, 197, 231, 250, 317`
- **Context**: Multiple `Record<string, any>` plus `timeline?: any[]` (`:231`). Violates the TS standard (`strict: true`, no `any`). Consumers of `parsed_data.records`, `source_row`, `detail`, `evidence_ref` lose type safety silently.
- **Suggestion**: Use `Record<string, unknown>` and narrow at use sites (they already call `String(v)`).

#### B-12. Video evidence card renders "NaN% Conf"
- **File**: `frontend/app/(authenticated)/cases/[id]/evidence/page.tsx:269` (also `:231`)
- **Context**: Backend video-upload `ai_tags` (`video.py:138-147`) contains no `confidence` field. The gallery card computes `Math.round(ev.ai_tags.confidence * 100)` → `Math.round(NaN)` → renders a `NaN% Conf` badge on every video tile.
- **Suggestion**: `Math.round((ev.ai_tags.confidence ?? 0) * 100)`, or skip the confidence badge when `file_type === "video"`.

#### B-13. CCTNS sync (external action) enforces no role validation
- **File**: `backend/app/routers/mock_cctns.py:37-73`
- **Context**: `POST /mock/cctns/sync` requires only `get_current_user` — any role (IO/SHO/LEGAL) can sync a case and flip `case.status = "synced"`. code_standards.md L20 requires role validation on CCTNS sync specifically.
- **Suggestion**: Gate with `require_role(...)` for the appropriate role(s) (e.g., SHO).

#### B-14. Video ledger tail-hash resolution is order-ambiguous on equal timestamps
- **File**: `backend/app/services/video_service.py:60-81` (`_get_tail_hash`)
- **Context**: Orders by `AuditEvent.created_at.desc()` + `limit(1)`. Multiple ledger events in the same case can share an identical DB timestamp; `verify_case_chain` orders `created_at.asc()` and can pick a different order than append time → false "chain break" under fast succession.
- **Suggestion**: Chain off an explicit sequence/PK or a stored `prev_hash` pointer instead of timestamp ordering.

### LOW

#### B-15. Hardcoded fallback JWT secret
- **File**: `backend/app/config.py:11` — `JWT_SECRET: str = Field(default="dev-secret-change-me")`
- **Context**: If deployed without the env var, tokens are signed with a publicly-known secret → forgeable auth. Fine for local dev; no guard prevents the default in a non-dev run.
- **Suggestion**: Fail fast at startup if `JWT_SECRET` is the default outside development.

#### B-16. IDOR — request/response GET-by-id endpoints not case-scoped
- **File**: `backend/app/routers/responses.py:35-41, 63-69`; `requests.py:52-59`
- **Context**: `get_request_response`, `get_response_correlations`, `get_request_details` fetch by id with only `get_current_user` — no check that the resource belongs to a case the user may view (unlike `osint.py`/`ingestion.py`). Any authenticated user can read any request/response by id. Low severity at 3-user hackathon scope, but inconsistent.
- **Suggestion**: Verify `case_id` ownership as elsewhere.

#### B-17. `promote_response_row` returns raw dict with no `response_model`
- **File**: `backend/app/routers/responses.py:72-83`
- **Context**: No `response_model`; returns the service dict directly (violates "Pydantic schemas for all responses / never return raw models"). Also `regenerate_insights` records audit with `user_id=None` (`analytics_service.py:116`) despite an authenticated user — actor lost.
- **Suggestion**: Add a Pydantic `response_model`; pass the acting `user_id` into the audit record.

#### B-18. Components use hooks without `"use client"` directive
- **File**: `frontend/components/case-command-center.tsx`, `entity-pivot-panel.tsx`, `evidence-review-workspace.tsx`
- **Context**: All call `useState`/`useEffect`/`useRouter` but omit `"use client"`. They work today only because each is imported into an already-client module graph. The moment one is imported by a Server Component, the build breaks.
- **Suggestion**: Add `"use client";` to each.

#### B-19. Router try/except remap still present in video upload handler
- **File**: `backend/app/routers/video.py` upload handler (`:57-60, 88-128`)
- **Context**: Carryover of previous #8. Wraps logic in try/except and raises `HTTPException` rather than letting `AppError` propagate to the global handler. This is input/file-write validation rather than a pure service-call remap, but the pattern persists here after being cleaned elsewhere.
- **Suggestion**: Raise domain `AppError`s and let the global handler map them.

#### B-20. Design-token drift (raw palette colors) — new locations
- **File**: `frontend/app/(authenticated)/cases/[id]/evidence/page.tsx:109-131, 244, 247, 306`; `frontend/components/copilot-panel.tsx:135, 189, 242`; `frontend/components/path-revision-list.tsx:38, 46, 50`
- **Context**: Raw palette classes (`bg-emerald-500/10 text-emerald-400`, `bg-sky-500/10`, `bg-purple-500/10`, `bg-slate-950/80`, `bg-slate-800`, etc.) bypass the semantic token system and won't respond to token changes. These files were not among the six flagged in the 2026-07-18 review.
- **Suggestion**: Map to `success`/`info`/`violet`/`warn`/`muted`/`surface-alt` tokens.

#### B-21. OSINT polling recreates its interval every tick; discarded optimistic state
- **File**: `frontend/components/osint-enrichment-panel.tsx:72-87, 89-132`
- **Context**: The polling `useEffect` depends on the whole `scanResult` object; each 3s poll calls `setScanResult`, changing identity and tearing down/recreating the interval. Separately, `handleTrigger` sets an optimistic `PENDING` then immediately `await fetchResult()`, overwriting it — the optimistic UI is pointless.
- **Suggestion**: Depend on `scanResult.scan.status` (a primitive) or a ref; drop the redundant post-optimistic `fetchResult()`.

#### B-22. Video duration silent default masks failures
- **File**: `backend/app/services/video_service.py:180-201` (`_get_video_duration`)
- **Context**: On any ffprobe failure, returns `120.0`. Downstream `duration_seconds` is recorded in the ledger payload as if measured — a fabricated "forensic" duration audited as fact.
- **Suggestion**: Record `None` + a flag instead of a fake value.

#### B-23. Re-sync purges prior OSINT scan history
- **File**: `backend/app/services/entity_service.py` (new-entity branch) → `osint_service.enqueue_osint_scan` (`osint_service.py:646-653`)
- **Context**: `enqueue_osint_scan` deletes all prior `SocialProfile`/`DataBreach`/`OsintSnapshot`/`OsintScan` rows for the entity. Combined with delta-tracking that reads the previous snapshot, a re-sync of a re-detected entity wipes the history the delta logic depends on. Depends on whether `existing_map` dedupe fully prevents repeat enqueues.
- **Suggestion**: Confirm dedupe prevents re-enqueue for existing entities; preserve snapshots needed for delta tracking.

---

## Summary

**Previous review: 13/15 solved, 1 partial, 1 by-design.** The Phase-10 architectural drift (genai gateway bypass, parallel audit ledger, inlined prompt, `/api/v1` prefix, unauthenticated video endpoints, `any` catches, `alert()`, flagged design-token drift) is essentially closed.

**New hunt: 23 findings.** The center of gravity moved to the **OSINT feature and cross-case scoping**:
- **B-1** — dossier export is a guaranteed 500 (missing `datetime` import).
- **B-2** — mock provider trigger mutates state with no auth.
- **B-3 / B-7** — OSINT scans likely fail silently (closed-session reuse) and their audit events are lost; both independently confirmed by two reviewers.
- **B-4** — copilot leaks provider responses across all cases.
- **B-5 / B-6** — a failed-scan badge renders invisible (`danger` token undefined) and a download link is hardcoded to localhost.

### Triage recommendation
1. **Fix before demo/ship:** B-1 (dossier 500), B-2 (unauthenticated mutation), B-3 (OSINT session — scans silently failing), B-4 (cross-case copilot leak).
2. **Fix soon:** B-5 (`danger` token), B-6 (hardcoded URL), B-7 (lost audit events), B-8 (case-number race), B-9 (video entity provenance), B-12 (`NaN% Conf`), B-13 (CCTNS role gate).
3. **Fix when convenient:** the remaining LOW items (B-10, B-11, B-14–B-23) — provenance completeness, `any` types, `"use client"` directives, token drift, JWT default guard, IDOR scoping, and the residual video try/except.

The golden path (Phase 1–9) remains in good shape; both build checkpoints pass. The new risk cluster is almost entirely inside the OSINT/video Phase-10 surface, not the core.
