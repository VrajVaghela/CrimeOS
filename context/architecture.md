# Architecture — Crime OS AI

## Tech Stack
| Layer | Choice | Why (hackathon rationale) |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + TypeScript** | Fast iteration, file-based routing, judges see polish |
| Styling | **Tailwind CSS + shadcn/ui** | Pre-built accessible components, consistent look in hours |
| Backend | **FastAPI (Python 3.11+)** | Native fit for AI pipeline; auto Swagger docs = "integration readiness" points |
| Database | **PostgreSQL 16 + pgvector** | One DB for relational data AND RAG embeddings — no separate vector store |
| ORM | **SQLAlchemy 2.0 + Alembic** | Typed models, quick migrations |
| LLM | **Google Gemini API** (`gemini-2.5-flash` default, `gemini-2.5-pro` for path suggestion) | Free tier, native multimodal (PDF/image/audio in one API), strong Hindi/Gujarati |
| Embeddings | Gemini `text-embedding-004` | Same API key, 768-dim, free tier |
| ASR | **Gemini audio input** (primary); `faster-whisper` (fallback if quota dies) | One less moving part |
| OCR | **Gemini vision** (primary); Tesseract w/ `guj`+`hin` traineddata (fallback) | Gemini handles handwriting far better |
| Email | **SMTP via Gmail app-password → demo mailbox** (Mailtrap as backup) | Real dispatch visible in demo |
| Background jobs | FastAPI `BackgroundTasks` | NO Celery/Redis — needless complexity for a hackathon |
| Auth | JWT (python-jose) with 3 hardcoded seeded users (io / sho / legal) | Enough for role-based-access bonus points |

## System Boundaries
```
[Next.js :3000] --HTTP/JSON--> [FastAPI :8000] --> [PostgreSQL+pgvector :5432]
                                    |--> Gemini API (LLM, vision, audio, embeddings)
                                    |--> SMTP (legal request dispatch)
                                    |--> /mock-provider (mock telecom/bank response endpoints, same FastAPI app)
                                    |--> /mock-cctns (mock eGujcop/CCTNS API, same FastAPI app)
```
- Frontend NEVER calls Gemini or the DB directly. All intelligence lives behind FastAPI.
- Mock external systems (providers, CCTNS) are routers **inside the same FastAPI app** under `/mock/*` — zero extra deploys, but presented as "external" in the demo.

## Folder Structure
```
erakshak/
├── agents.md                  # AI master instructions
├── context/                   # this context system
├── docker-compose.yml         # postgres + pgvector only
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, router registration, CORS
│   │   ├── config.py          # pydantic-settings, reads .env
│   │   ├── database.py        # engine, session, Base
│   │   ├── models/            # SQLAlchemy models (one file per aggregate)
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── routers/           # HTTP layer ONLY — no business logic
│   │   │   ├── auth.py, cases.py, ingestion.py, paths.py,
│   │   │   ├── requests.py, responses.py, summaries.py,
│   │   │   └── mock_provider.py, mock_cctns.py
│   │   ├── services/          # ALL business logic lives here
│   │   │   ├── ingestion_service.py    # PDF/image/audio → structured complaint
│   │   │   ├── extraction_service.py   # entity extraction via Gemini
│   │   │   ├── rag_service.py          # embed, retrieve SOP/legal chunks
│   │   │   ├── path_service.py         # investigation path suggestion
│   │   │   ├── legal_request_service.py# template fill + dispatch
│   │   │   ├── analytics_service.py    # provider response parsing/insights
│   │   │   ├── summary_service.py      # case log + summary generation
│   │   │   └── audit_service.py        # audit trail writes
│   │   ├── ai/
│   │   │   ├── gemini_client.py        # THE ONLY file that imports google-genai
│   │   │   └── prompts.py              # ALL prompts as named constants
│   │   └── seeds/             # seed script + SOP/legal datasets + sample complaints
│   ├── alembic/
│   └── requirements.txt
├── frontend/
│   ├── app/                   # App Router pages
│   │   ├── login/  ├── dashboard/  ├── cases/[id]/  (tabs: overview, ingestion,
│   │   │                            path, requests, responses, summary, audit)
│   ├── components/            # ui/ (shadcn) + domain components
│   ├── lib/api.ts             # THE ONLY file that does fetch() to backend
│   └── lib/types.ts           # mirrors backend schemas
└── data/                      # sample complaint PDFs/audio/images for demo
```

## Architectural Rules (strict)
1. **Routers are thin.** A router validates input, calls one service function, returns a schema. No Gemini calls, no SQL in routers.
2. **`gemini_client.py` is the single Gemini gateway.** Retries, timeouts, JSON-mode parsing live there once. Everything else calls its typed helpers (`generate_json()`, `transcribe()`, `embed()`).
3. **All prompts in `prompts.py`** as constants with `{placeholders}`. Never inline prompt strings in services.
4. **Every AI mutation writes an audit event** via `audit_service` in the same transaction.
5. **Frontend fetches only through `lib/api.ts`.** No raw `fetch()` in components.
6. **Fallback rule:** every AI call has a deterministic fallback (cached response or template) so the demo cannot die on API failure. Store last-good responses.
7. **Seeds are sacred:** `python -m app.seeds.run` must produce a fully demo-ready DB (users, 2 pre-baked cases, SOP embeddings, legal sections).

## Initial Database Schema
```sql
users            (id, username, hashed_password, role ENUM('IO','SHO','LEGAL'), full_name)
cases            (id, case_number, title, status, crime_type, created_by → users, created_at)
complaints       (id, case_id →, source_type ENUM('pdf','image','audio','text'),
                  original_file_path, detected_language, raw_text, translated_text, created_at)
extracted_entities(id, complaint_id →, entity_type, value, confidence)  -- person/phone/account/amount/date/location
legal_sections   (id, code ENUM('BNS','BNSS','BSA'), section_number, title, text)  -- seeded dataset
case_sections    (id, case_id →, legal_section_id →, ai_reasoning, confidence)
sop_documents    (id, title, crime_type, source_file)
sop_chunks       (id, sop_document_id →, chunk_text, embedding VECTOR(768))
investigation_paths(id, case_id →, generated_at, model_used)
path_steps       (id, path_id →, step_order, title, description, sop_citation,
                  status ENUM('pending','in_progress','done','skipped'), suggested_action_type)
legal_requests   (id, case_id →, path_step_id → NULL, provider_type ENUM('telecom','bank','platform'),
                  provider_name, template_used, generated_body, recipient_email,
                  status ENUM('draft','approved','dispatched','responded'), dispatched_at)
provider_responses(id, legal_request_id →, received_at, file_path, parsed_data JSONB, ai_insights TEXT)
case_summaries   (id, case_id →, version INT, content, generated_at)  -- version history
audit_events     (id, case_id →, user_id →, action, detail JSONB, created_at)  -- append-only
evidence_files   (id, case_id →, file_path, ai_tags JSONB, uploaded_at)  -- bonus
```
Rules: UUID PKs. `audit_events` is append-only — never UPDATE/DELETE it. Summaries never overwrite — always insert new version.
