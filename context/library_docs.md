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

## Ollama (local LLM + embeddings) — `backend/app/ai/ollama_client.py` ONLY
- External process on `http://localhost:11434`, started outside the app. Models live off the C: drive:
  `set OLLAMA_MODELS=E:\models\ollama && E:\programs\ollama\ollama.exe serve`
- Two endpoints are used, both via `httpx`: `POST /api/chat` and `POST /api/embed`.
- Structured output: `format` accepts a **JSON Schema object** (or the string `"json"`). Pass
  `schema.model_json_schema()` through verbatim — `$defs`/`$ref` are resolved by llama.cpp's grammar
  converter, verified against `GeminiPathRevisionResponse`, `GeminiCopilotResponse` and
  `TimelineSynthesisOut`. Do NOT write a `$ref` inliner; a bad grammar fails worse than a
  `ValidationError`, which the gateway already escalates on.
- The grammar conversion **discards `title` and `description`**, so field semantics Gemini receives via
  `response_schema` are invisible to the local model. Always append `LOCAL_JSON_SCHEMA_INSTRUCTION`.
  Verified: without it, an `event_type` came back as `"Complaint Filed"` instead of `complaint_filed`.
- `/api/embed` takes `input` as an array and returns `{"embeddings": [[...]]}`. `nomic-embed-text` is
  natively 768-dim, matching `Vector(768)`. Empty `input` returns `[]` rather than erroring.
- `qwen2.5:3b` capabilities are `["completion","tools"]` — **no vision**. Never route image, PDF or
  video work to it.
- Set `num_ctx` explicitly (8192). Ollama's 4096 default silently truncates the FRONT of a long prompt,
  which drops the instructions and yields shape-valid nonsense.
- **Budget prompts in tokens, not characters.** Measured chars-per-token on `qwen2.5:3b`: Latin 3.24,
  Devanagari 0.86, **Gujarati 0.56**. So Gujarati costs ~5.8x more tokens per character than English, and
  a flat character cap silently overflows `num_ctx` on exactly the trilingual content this app handles.
  `ollama_client.estimate_tokens()` weights each script and is tuned to over-estimate by ~5-20%, because
  over-estimating routes to Gemini (safe) while under-estimating corrupts the prompt (silent).
- A missing model tag 404s; `/api/chat` does not auto-pull.
- `qwen2.5:3b` has no vision. If local OCR is ever wanted, `qwen3-vl:8b` (6.1GB q4) is the strongest open
  option — an arXiv Devanagari stress-test (2606.29213) found it beats GPT-5.5 on real degraded Devanagari
  scans and trails only Gemini and Claude. But its OCR language list covers Hindi and **not Gujarati**, and
  it would not fit alongside `qwen2.5:3b` + Whisper in 8GB VRAM.

## faster-whisper (local ASR) — `backend/app/ai/whisper_client.py` ONLY
- `WhisperModel("E:/models/whisper/faster-whisper-medium", device=..., compute_type=...)`. Import
  `faster_whisper` inside the loader function, never at module scope, so `python -c "import app.main"`
  still passes when the package is absent.
- CTranslate2, not torch. `ctranslate2.get_cuda_device_count()` reports the **driver** and does not tell
  you whether cuBLAS/cuDNN are loadable. Worse, CUDA can *load* successfully and only fail once inference
  touches cuBLAS — so `whisper_client` falls back to CPU both at load AND on the first inference failure.
- The CUDA DLLs ship in `nvidia-cublas-cu12` / `nvidia-cudnn-cu12` under `site-packages/nvidia/*/bin`.
  CTranslate2 resolves them from its C++ extension via `LoadLibrary`, which searches **PATH and ignores
  `os.add_dll_directory`** — so `_register_cuda_dlls()` prepends to `os.environ["PATH"]`. Also note
  `os.add_dll_directory` returns a handle that *removes* the directory when garbage-collected; keep it.
- Measured on an RTX 4060 8GB, 57s Hindi clip: **CPU int8 92.5s vs CUDA float16 10.8s (8.6x)**.
- `model.transcribe()` returns `(segments, info)` where `segments` is a **lazy generator** but `info` is
  populated eagerly — so `info.language` is readable before paying for decoding.
- Use `faster_whisper.audio.decode_audio(io.BytesIO(bytes))` once and reuse the array for both the
  transcribe and translate passes; a `BytesIO` handed to a second pass without `seek(0)` is empty.
- `task="translate"` uses Whisper's native translate head — better hi→en than round-tripping through
  `qwen2.5:3b`, and it keeps ASR working when Ollama is down.
- **Do NOT switch to `large-v3-turbo`.** It is ~8x faster but OpenAI explicitly **excluded translation
  from its training data**, so `task="translate"` does not work (faster-whisper issue #1237). Our
  non-English path depends on it. `distil-*` models are English-only for the same reason.
- Gujarati output is unreliable (often the wrong script), which would also corrupt
  `_detect_language_from_text`. `WHISPER_ESCALATE_LANGUAGES=gu` defers it to Gemini.
- Measured: ~68s per pass for 57s of audio on CPU int8, so non-English audio is ~90s end to end.

## Tesseract (OCR fallback)
- Still unwired. `qwen2.5:3b` has no vision, so image/PDF OCR remains Gemini-only. Implement only if
  Gemini quota becomes a real problem.
- (Superseded: the previous rule here also told you to keep `faster-whisper` as a `NotImplementedError`
  stub. Local ASR is now wired for real — see the faster-whisper section above.)
