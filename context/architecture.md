# Architecture — Crime OS AI

## Tech Stack
| Layer | Choice | Why (hackathon rationale) |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + TypeScript** | Fast iteration, file-based routing, judges see polish |
| Styling | **Tailwind CSS + shadcn/ui** | Pre-built accessible components, consistent look in hours |
| Backend | **FastAPI (Python 3.11+)** | Native fit for AI pipeline; auto Swagger docs = "integration readiness" points |
| Database | **PostgreSQL 16 + pgvector** | One DB for relational data AND RAG embeddings — no separate vector store |
| ORM | **SQLAlchemy 2.0 + Alembic** | Typed models, quick migrations |
| LLM | **Ollama `qwen2.5:3b`** (local, primary for text + structured JSON); **Google Gemini API** (`gemini-2.5-flash` default, `gemini-2.5-pro` for path suggestion) for all vision and as escalation | Local = no quota, no data egress. Gemini keeps multimodal (PDF/image/video) and strong Hindi/Gujarati |
| Embeddings | **Ollama `nomic-embed-text`** (local, 768-dim); Gemini `text-embedding-004` selectable via `EMBEDDING_PROVIDER` | Native 768-dim matches the `Vector(768)` column with no schema change |
| ASR | **`faster-whisper-medium`** (local, primary for audio); Gemini audio input for Gujarati and on failure | Whisper's native `task="translate"` head handles hi→en; its Gujarati quality is too poor to trust |
| OCR | **Gemini vision** (primary); Tesseract w/ `guj`+`hin` traineddata (fallback) | Gemini handles handwriting far better; `qwen2.5:3b` has no vision at all |
| Email | **SMTP via Gmail app-password → demo mailbox** (Mailtrap as backup) | Real dispatch visible in demo |
| Background jobs | FastAPI `BackgroundTasks` | NO Celery/Redis — needless complexity for a hackathon |
| Auth | JWT (python-jose) with 3 hardcoded seeded users (io / sho / legal) | Enough for role-based-access bonus points |

## System Boundaries
```
[Next.js :3000] --HTTP/JSON--> [FastAPI :8000] --> [PostgreSQL+pgvector :5432]
                                    |--> Ollama :11434 (local LLM + embeddings)
                                    |--> faster-whisper (local, in-process ASR)
                                    |--> Gemini API (vision, video, escalation)
                                    |--> SMTP (legal request dispatch)
                                    |--> /mock-provider (mock telecom/bank response endpoints, same FastAPI app)
                                    |--> /mock-cctns (mock eGujcop/CCTNS API, same FastAPI app)
                                    |--> /case-intelligence (command center, entities, graph, copilot)
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
│   │   │   ├── command_center_service.py # workflow state + next-best-action projection
│   │   │   ├── entity_service.py        # normalize entities + relationship pivots
│   │   │   ├── path_revision_service.py # adaptive path revisions and branches
│   │   │   ├── evidence_service.py     # source markers, transcript/media links
│   │   │   ├── copilot_service.py      # case-scoped cited assistant
│   │   │   ├── provenance_service.py   # AI output citation ledger
│   │   │   └── audit_service.py        # audit trail writes
│   │   ├── ai/
│   │   │   ├── gemini_client.py        # THE single AI gateway; only importer of google-genai
│   │   │   ├── ollama_client.py        # local LLM + embeddings (leaf; no DB, no gateway import)
│   │   │   ├── whisper_client.py       # local ASR (leaf; no DB, no gateway import)
│   │   │   └── prompts.py              # ALL prompts as named constants
│   │   ├── scripts/           # one-off maintenance entry points (re-embed, backfills)
│   │   └── seeds/             # seed script + SOP/legal datasets + sample complaints
│   ├── alembic/
│   └── requirements.txt
├── frontend/
│   ├── app/                   # App Router pages
│   │   ├── login/  ├── dashboard/  ├── cases/[id]/  (tabs: overview, ingestion,
│   │   │                            osint, path, requests, responses, evidence,
│   │   │                            timeline, summary, audit)
│   ├── components/            # ui/ (shadcn) + domain components
│   ├── lib/api.ts             # THE ONLY file that does fetch() to backend
│   └── lib/types.ts           # mirrors backend schemas
└── data/                      # sample complaint PDFs/audio/images for demo
```

## Architectural Rules (strict)
1. **Routers are thin.** A router validates input, calls one service function, returns a schema. No Gemini calls, no SQL in routers.
2. **`gemini_client.py` is the single AI gateway.** Retries, timeouts, provider routing and JSON-mode parsing live there once. Everything else calls its typed helpers (`generate_json()`, `transcribe()`, `embed()`) and never picks an engine itself. `ollama_client.py` and `whisper_client.py` are leaves the gateway calls — services must not import them directly.
3. **All prompts in `prompts.py`** as constants with `{placeholders}`. Never inline prompt strings in services.
4. **Every AI mutation writes an audit event** via `audit_service` in the same transaction.
5. **Frontend fetches only through `lib/api.ts`.** No raw `fetch()` in components.
6. **Fallback rule:** every AI call has a deterministic fallback (cached response or template) so the demo cannot die on API failure. Store last-good responses.
7. **Seeds are sacred:** `python -m app.seeds.run` must produce a fully demo-ready DB (users, 2 pre-baked cases, SOP embeddings, legal sections).
8. **The command center is a projection, not a second source of truth.** Derive workflow stage from persisted case, complaint, path, request, response, summary, and audit state; persist only explicit workflow overrides/blockers.
9. **Adaptive paths are append-only revisions.** Never mutate history to make a new path look like the old path; mark one revision active and retain superseded revisions.
10. **Entity intelligence is case-scoped.** Normalize values within the case first; do not imply a cross-case identity match without an explicit source and confidence explanation.
11. **Copilot is read-only by default.** It can propose actions and draft content, but only existing explicit UI actions may mutate state or dispatch a request.
12. **Every AI response carries provenance.** Store and return source type, source identifier, excerpt/locator, and confidence where available.

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
investigation_paths(id, case_id →, parent_path_id → NULL, revision_number,
                    trigger_type, change_reason, is_active, generated_at, model_used)
path_steps       (id, path_id →, step_order, title, description, sop_citation,
                  status ENUM('pending','in_progress','done','skipped'), suggested_action_type)
legal_requests   (id, case_id →, path_step_id → NULL, provider_type ENUM('telecom','bank','platform'),
                  provider_name, template_used, generated_body, recipient_email,
                  status ENUM('draft','approved','dispatched','responded'), dispatched_at)
provider_responses(id, legal_request_id →, received_at, file_path, parsed_data JSONB, ai_insights TEXT)
case_summaries   (id, case_id →, version INT, content, generated_at)  -- version history
audit_events     (id, case_id →, user_id →, action, detail JSONB, created_at)  -- append-only
evidence_files   (id, case_id →, file_path, ai_tags JSONB, uploaded_at)  -- bonus
case_workflow_state(case_id →, current_stage, blocker_codes JSONB, next_action_type,
                    next_action_label, updated_at)
case_entities    (id, case_id →, entity_type, canonical_value, display_value,
                  confidence, first_seen_at, last_seen_at)
entity_relationships(id, case_id →, source_entity_id →, target_entity_id →,
                     relationship_type, confidence, evidence_ref JSONB)
evidence_markers (id, evidence_file_id →, marker_type, start_ms, end_ms,
                  transcript_text, linked_entity_ids JSONB, created_at)
ai_citations     (id, case_id →, output_type, output_id, source_type, source_id,
                  excerpt, locator, confidence, created_at)
copilot_messages (id, case_id →, user_id →, role, message, cited_source_ids JSONB,
                  created_at)
```
Rules: UUID PKs. `audit_events` is append-only — never UPDATE/DELETE it. Summaries never overwrite — always insert new version. Path revisions and AI citations are also append-only. `output_id` in `ai_citations` is a UUID without a polymorphic database FK; the owning service validates it.

## Phase 8 folder additions
Backend routers: `command_center.py`, `entities.py`, `copilot.py`, `evidence.py`.
Backend services: `command_center_service.py`, `entity_service.py`, `path_revision_service.py`, `evidence_service.py`, `copilot_service.py`, `provenance_service.py`.
Frontend domain components: `case-command-center.tsx`, `workflow-spine.tsx`, `next-best-action.tsx`, `source-chip.tsx`, `path-revision-list.tsx`, `entity-pivot-panel.tsx`, `evidence-review-workspace.tsx`, `copilot-panel.tsx`, `request-readiness-checklist.tsx`, `response-correlation-panel.tsx`.

## Upstream Feature Integration Constraints (Phase 10)

The `vraj` branch is the canonical application. Upstream branches are feature
sources, not replacement applications. Preserve the current FastAPI + Next.js
App Router + PostgreSQL/pgvector stack, Ferrari UI system, Phase 8 intelligence,
and the golden path.

| Source | Feature to retain | Integration boundary |
|---|---|---|
| `origin/main` (`cfaf939`, `0d06aca`) | Timeline Agent, officer notes, CCTV frame analysis/pinning | Port/merge into the existing `app/(authenticated)/cases/[id]` routes and current models/services. Reuse `EvidenceFile`, `audit_service`, `gemini_client.py`, and `prompts.py`; add only the timeline aggregate and migration needed by the feature. |
| `origin/crimeos/digitalfootprint` (`dc33884`) | OSINT enrichment: social profiles, breach exposure, risk summary, discovered pivots | Do not merge the Go server, Go migrations, React/Vite frontend, or live scanner dependencies. Implement a native FastAPI service/router/schema and case-scoped Next.js panel using deterministic demo fixtures and explicit source/confidence provenance. |
| `origin/crimeos/videoAnalyzer` (`a6f6c29`) | Secure video upload, asynchronous analysis status, timestamped incident report, click-to-seek timeline | Do not merge the second FastAPI app, Vite app, Celery workers, Redis, Mongo, or duplicate case schema. Adapt the behavior to `EvidenceFile` + `TimelineEvent`/timeline report, FastAPI `BackgroundTasks`, existing upload storage, Gemini gateway, audit events, and current evidence/timeline UI. |

Integration rules:

1. Never overwrite current `vraj` work or resolve a conflict by taking an upstream branch wholesale. For overlapping files, keep the current branch as the visual/architectural baseline and reapply only the upstream behavior that passes the feature acceptance criteria.
2. Before any merge, commit or safely stash the existing dirty worktree. Do not use destructive reset/checkout operations. Keep the uncommitted Ferrari/shell changes attributable to the current developer.
3. Merge compatible history first (Timeline Agent), then port the two incompatible feature branches as native features. Do not create parallel backends or frontends.
4. All new endpoints go through `lib/api.ts`; all AI calls go through `gemini_client.py`; all prompts live in `prompts.py`; all state changes record an audit event; all AI output exposes provenance and deterministic fallback behavior.
5. A feature is not considered integrated until its schema/model, migration, service, router/schema, typed API, current Ferrari UI, seed/demo data, and smoke checkpoint are complete.

## Post-Phase 10 Review Remediation Boundary

The Phase 10 upstream ports are functionally integrated, but the 2026-07-18
code review identified conformance debt concentrated in the video workflow and
its surrounding UI. Phase 11 is a hardening pass, not a new product phase.

- Video status and report reads are authenticated and case-scoped like every
  other application read.
- The video API uses the flat `/video` route convention and application-owned
  processing states; Celery/Redis terminology is not part of the contract.
- Video AI uses typed helpers in `gemini_client.py`, named prompts in
  `prompts.py`, deterministic fallback/cache behavior, and the shared audit
  service. No service constructs `AuditEvent` directly.
- Chain-of-custody metadata may remain append-only and verifiable, but it must
  live inside the shared audit event shape and retain the initiating actor.
- Phase 10 frontend surfaces use the existing Ferrari semantic tokens and
  shared error/toast patterns. No raw palette values, arbitrary hex colors,
  arbitrary shadows, browser alerts, or `any` catches are introduced.
