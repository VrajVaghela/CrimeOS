# Library Implementation Rules — Crime OS AI

How the AI must use each key library. When actual API syntax is uncertain, fetch current docs (Context7) — do not guess SDK signatures.

## google-genai (Gemini) — `backend/app/ai/gemini_client.py` ONLY
- Package: `google-genai` (the new unified SDK), client via `genai.Client(api_key=settings.GEMINI_API_KEY)`.
- Models from config: `GEMINI_FLASH_MODEL=gemini-2.5-flash` (ingestion, extraction, analytics, summaries), `GEMINI_PRO_MODEL=gemini-2.5-pro` (investigation paths only). Embeddings: `text-embedding-004`.
- **Always JSON mode for structured output**: pass `response_mime_type="application/json"` + `response_schema` (Pydantic model) so extraction/paths return validated objects — never regex-parse free text.
- Multimodal: upload PDFs/images/audio as inline bytes (<20MB) via `types.Part.from_bytes(data, mime_type)`; use the Files API only if a demo file exceeds that.
- Multilingual: prompt pattern = "Content may be in Gujarati, Hindi, or English. Detect language, then produce English output; preserve original names/numbers verbatim."
- Rate limits (free tier): serialize calls, no parallel fan-out; cache every successful response to `fallback_cache` table keyed by (purpose, input-hash) and serve it on API failure.
- Exposed helpers only: `generate_json(prompt, schema, files=None, model=...)`, `generate_text(...)`, `embed(texts) -> list[list[float]]`.

## pgvector + SQLAlchemy
- `from pgvector.sqlalchemy import Vector`; column `embedding = mapped_column(Vector(768))`.
- Enable extension in first Alembic migration: `CREATE EXTENSION IF NOT EXISTS vector`.
- Retrieval: cosine distance `SopChunk.embedding.cosine_distance(query_vec)` ordered ascending, `LIMIT 5`. No index needed (tiny corpus) — skip IVFFlat.
- Chunking rule: split SOP docs by section headings, ~500 tokens max, store heading in `chunk_text` prefix so citations read well in UI.

## SQLAlchemy 2.0 / Alembic
- 2.0 style only: `Mapped[...]` + `mapped_column`, `select()` — no legacy `Query`.
- One `Base` in `database.py`; session per request via `get_db` dependency; services receive `db: Session` as first arg.
- Migrations: `alembic revision --autogenerate` — but hackathon rule: schema churn before Phase 3 may just `drop_all/create_all` + reseed.

## FastAPI
- Routers with `prefix` + `tags` (tags make Swagger demo-worthy: show `/docs` for "integration readiness").
- Auth: `Depends(get_current_user)`; role guard via `require_role("SHO")` dependency factory.
- File uploads: `UploadFile`, save to `uploads/{case_id}/`, store relative path in DB. Serve via `StaticFiles` mount.
- Long AI operations (>10s): endpoint creates the record with `status='processing'`, runs work in `BackgroundTasks`, frontend polls every 2s. Ingestion and path generation use this pattern.

## Email (smtplib + Jinja2)
- Templates in `backend/app/templates/requests/*.txt.j2` — LERS-style: subject line with case number, formal headers, legal-section citation, data-requested block, signature block from officer profile.
- Send via `smtplib.SMTP_STARTTLS` with `SMTP_HOST/PORT/USER/PASSWORD` from config. Recipient is ALWAYS `settings.DEMO_PROVIDER_INBOX` regardless of provider chosen — real provider emails are display-only fiction.
- Dispatch failures must NOT 500: mark request `dispatched` with `dispatch_note='smtp_failed_demo_mode'` and log — demo continues.

## Next.js 14 + shadcn/ui + Tailwind
- App Router. Case pages under `app/cases/[id]/` with a shared layout rendering tab navigation.
- shadcn components to install day one: `button card input label table tabs badge dialog alert toast skeleton select textarea separator avatar`.
- All colors/spacing via tokens in `ui_tokens.md` — never arbitrary hex in `className`.
- `lib/api.ts`: base URL from `NEXT_PUBLIC_API_URL`; attaches JWT from localStorage; throws `ApiError` on non-2xx.
- Polling helper `usePolling(fn, intervalMs, stopWhen)` for processing states.

## Phase 8 implementation constraints
- Do not add a graph database or graph UI dependency. Start with PostgreSQL relationship rows and a grouped entity pivot; render a lightweight graph only if the existing frontend stack can support it without new infrastructure.
- The case copilot uses the existing `generate_json()` / `generate_text()` helpers through `gemini_client.py`; it must not import the Gemini SDK directly.
- Copilot retrieval is case-scoped: assemble complaint text, normalized entities, SOP/legal citations, provider records, evidence markers, and audit events before calling Gemini.
- Provenance is returned as typed Pydantic/TypeScript data and persisted in `ai_citations`; source chips must link to an actual stored source or say that no grounded answer was found.
- Request readiness is deterministic validation in a service; Gemini may explain a missing legal basis but may not decide that a required field is valid.
- Use native HTML media/audio elements and existing shadcn primitives for evidence review before considering any new media library.

## Tesseract / faster-whisper (fallbacks only)
- Do NOT wire these in Phase 2. Stub interface `fallback_ocr(path)` / `fallback_asr(path)` raising `NotImplementedError` — implement only if Gemini quota becomes a real problem.
