# Code Standards — Crime OS AI

Hackathon calibration: strict enough that AI-generated code stays consistent, loose enough to move fast. No tests except a smoke script for the golden path. No premature abstraction.

## Python (backend)
- **Python 3.11+, full type hints on every function signature.** Return types mandatory on services.
- Pydantic v2 for all request/response schemas; never return raw SQLAlchemy models from routers.
- Naming: `snake_case` functions/modules, `PascalCase` classes, `UPPER_SNAKE` constants/prompts.
- File naming: `<domain>_service.py`, `<domain>.py` in routers, singular model files (`case.py` defines `Case`).
- Async: routers are `async def`; Gemini/SMTP calls run in `run_in_executor` or use async clients. DB via sync SQLAlchemy session (simpler) with `Depends(get_db)`.
- Config: **only** via `config.py` (`pydantic-settings`). Never `os.getenv` elsewhere. Never hardcode API keys, emails, or model names in services.
- Errors: services raise domain exceptions (`IngestionError`, `GenerationError`, ...) defined in `app/exceptions.py`; a single FastAPI exception handler maps them to JSON `{ "error": { "code", "message" } }`. Routers do NOT try/except.
- AI-call protocol (in `gemini_client.py` only): 2 retries with backoff → on final failure return fallback-cache entry if present → else raise `GenerationError`. Log every call with model, latency, purpose.
- Every state-changing service function ends with `audit_service.record(...)` before commit.
- No `print()` — use `logging` with the app logger.

## TypeScript (frontend)
- `strict: true`. No `any` (use `unknown` + narrowing if stuck).
- Naming: `kebab-case` file names, `PascalCase` components, `camelCase` vars/functions, `use-` prefix hooks.
- Components: Server Components by default; `"use client"` only when state/handlers needed.
- Types in `lib/types.ts` mirror backend Pydantic schemas exactly — same field names (backend serializes snake_case; keep snake_case in TS types, do not remap).
- Data fetching: all HTTP through `lib/api.ts` typed functions (`getCase(id): Promise<Case>`). Client-side mutations + refresh via `router.refresh()` or simple SWR — **no Redux, no react-query setup unless already added**.
- State: local `useState` first; shared state via URL params or React context (`auth-context` only). No global stores.
- Errors: `api.ts` throws `ApiError { code, message }`; pages show shadcn `<Alert>` / toast. Never a blank screen — every page has loading + error + empty states.
- Forms: plain controlled inputs or `react-hook-form` + zod for the complaint wizard only.

## Both
- Small commits per feature: `feat(scope): ...`, `fix(scope): ...`.
- TODOs must be `// TODO(demo-risk): ...` if they endanger the golden path — grep for these before demo.
- No dead code, no commented-out blocks left behind.
- English for all code, comments, identifiers. UI copy supports English + Hindi labels where cheap (see ui_rules).
