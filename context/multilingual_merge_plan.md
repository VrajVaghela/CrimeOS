# Multilingual Merge Plan
**Branch:** `origin/manan/multilingual` → `main`
**Strategy:** Cherry-pick port (NOT `git merge`)
**Status:** ✅ IMPLEMENTED — 2026-07-28 (see Phase 12 in `progress_tracker.md`)
**Created:** 2026-07-28

---

## Why not `git merge`

A direct merge would produce hundreds of conflicts and likely break the app:

| Conflict source | Detail |
|---|---|
| Route structure | multilingual uses flat `app/cases/…`; main uses `app/(authenticated)/cases/…` |
| Missing Phase 8–11 | multilingual never received copilot, OSINT, video, entity-pivot, Ferrari design, code-review hardening |
| File renames | 10+ pages were renamed/moved between the two branches |
| Context file moves | `PRODUCT.md`, `PROJECT_ANALYSIS.md` moved to repo root on multilingual |

The multilingual branch contributes exactly **two things** that main needs:
1. **i18n infrastructure** — dictionaries, language context, toggle, translated-text-block, hook
2. **Backend translate service** — `/translate` router + in-memory cache service

Everything else on that branch is an older, incomplete version of what main already has.

---

## Files to port from `origin/manan/multilingual`

### New files (don't exist on main — copy verbatim)

| Source path on multilingual | Destination on main |
|---|---|
| `frontend/lib/i18n/en.ts` | `frontend/lib/i18n/en.ts` |
| `frontend/lib/i18n/hi.ts` | `frontend/lib/i18n/hi.ts` |
| `frontend/lib/i18n/gu.ts` | `frontend/lib/i18n/gu.ts` |
| `frontend/lib/language-context.tsx` | `frontend/lib/language-context.tsx` |
| `frontend/components/language-toggle.tsx` | `frontend/components/language-toggle.tsx` |
| `frontend/components/translated-text-block.tsx` | `frontend/components/translated-text-block.tsx` |
| `frontend/hooks/use-translated-content.ts` | `frontend/hooks/use-translated-content.ts` |
| `backend/app/routers/translate.py` | `backend/app/routers/translate.py` |
| `backend/app/services/translate_service.py` | `backend/app/services/translate_service.py` |

### Modified files (apply only the i18n-related delta)

| File | What to apply |
|---|---|
| `frontend/app/(authenticated)/layout.tsx` | Add `<LanguageToggle>` to the topbar (right side, next to existing controls) |
| `frontend/app/layout.tsx` | Wrap `<body>` children with `<LanguageProvider>` |
| `backend/app/main.py` | Add `from app.routers import translate` and `app.include_router(translate.router)` |

> **Do NOT apply** any other diffs from the multilingual branch — page content changes, route restructuring, component rewrites, etc. are all older versions of code that main has already superseded.

---

## Implementation steps

### Step 1 — Extract i18n files from remote branch
```bash
git fetch origin
git checkout origin/manan/multilingual -- \
  frontend/lib/i18n/en.ts \
  frontend/lib/i18n/hi.ts \
  frontend/lib/i18n/gu.ts \
  frontend/lib/language-context.tsx \
  frontend/components/language-toggle.tsx \
  frontend/components/translated-text-block.tsx \
  frontend/hooks/use-translated-content.ts \
  backend/app/routers/translate.py \
  backend/app/services/translate_service.py
```

### Step 2 — Wire LanguageProvider into root layout
In `frontend/app/layout.tsx`:
- Add import: `import { LanguageProvider } from "@/lib/language-context";`
- Wrap the existing `{children}` with `<LanguageProvider>{children}</LanguageProvider>`

### Step 3 — Add LanguageToggle to authenticated topbar
In `frontend/app/(authenticated)/layout.tsx`:
- Add import: `import { LanguageToggle } from "@/components/language-toggle";`
- Place `<LanguageToggle />` in the topbar's right-side controls area (alongside existing Settings/Help buttons, around line 276–293)

### Step 4 — Register translate router in backend
In `backend/app/main.py`:
- Add `translate` to the existing router import line
- Add `app.include_router(translate.router)` after the existing router registrations

### Step 5 — Verify no import path issues
The multilingual branch used flat routes (`@/app/cases/...`). The extracted files use only `@/lib/...` and `@/components/...` imports — these are path-alias imports that work identically on main. No path fixes needed for the 9 new files.

### Step 6 — Update context files
- `context/progress_tracker.md` — add Phase 12: Multilingual Support section, mark complete after implementation
- `context/project_overview.md` — add multilingual support to feature list

---

## Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `language-context.tsx` uses a localStorage key that conflicts | Low | Key is `crime_os_lang` — unique, no conflict |
| `/translate` endpoint conflicts with existing routes | Low | No existing `/translate` prefix in `backend/app/main.py` |
| `LanguageProvider` breaks SSR | Low | Context uses `useEffect` for localStorage; safe for Next.js |
| Dictionary keys missing for Phase 8–11 UI strings | Medium | `useT()` falls back to English for missing keys — graceful degradation, no crash |
| Gemini API key needed for Tier 2 (AI translation) | Medium | `translate_service.py` uses the same `GEMINI_API_KEY` already in `.env` |

---

## What this merge does NOT do

- Does not translate Phase 8–11 UI strings (copilot, OSINT, video, entity-pivot panels) — those will show English via fallback until a follow-up pass adds their keys to `en/hi/gu.ts`
- Does not change any existing component logic or styling
- Does not alter the route structure
- Does not touch the database schema

---

## Post-merge follow-up (optional, not in scope now)

- Extend `en/hi/gu.ts` dictionaries with Phase 8–11 string keys
- Add `useT()` calls to the newer components (copilot-panel, osint-enrichment-panel, etc.)
