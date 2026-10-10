# 🔄 CrimeOS AI — End-to-End Data Flow Specification

This document traces the complete data lifecycle across **CrimeOS AI (eRakshak)**. It details how data enters the platform, is processed by AI services, interacts with PostgreSQL and pgvector, and flows out to the user interface and external systems.

---

## 1. Master Investigation Lifecycle Flow (Golden Path)

```
[Complaint Ingestion]
  │  (PDF / Audio / Handwritten Image / Gujarati / Hindi)
  ▼
[AI Multimodal OCR / ASR & Language Detection]
  │  (Extracts raw text + English translation via Gemini)
  ▼
[Structured Entity Extraction]
  │  (11 entity types: Suspects, Phones, Bank Accounts, UPI IDs, Amounts)
  ▼
[pgvector SOP RAG Retrieval]
  │  (Query SOP chunks using text-embedding-004 cosine similarity)
  ▼
[AI Investigation Path & Statutory Legal Mapping]
  │  (Step-by-step guidance + BNS / BNSS / BSA criminal section suggestions)
  ▼
[Automated LERS Legal Request Drafting]
  │  (Pre-fill Jinja2 templates: CDR, Bank Freeze, Platform Logs)
  ▼
[6 Pre-Dispatch Readiness Gates & SHO Authorization]
  │  (Audits recipient email, legal basis, linkages; SHO approves)
  ▼
[SMTP Notice Dispatch & Response Ingestion]
  │  (Sends TLS email; receives provider CSV/CDR response data)
  ▼
[Response Row Correlation & Case Diary Promotion]
  │  (Matches transactions to suspect entities; promotes records as AiCitations)
  ▼
[Dynamic Investigation Path Revision]
  │  (Re-evaluates investigation path based on new provider evidence)
  ▼
[One-Click Case Summary & Immutable Audit Log]
  │  (Generates versioned summary; records every action in append-only log)
```

---

## 2. Sequence Diagram: Golden Path Investigation Flow

```mermaid
sequenceDiagram
    autonumber
    actor IO as Investigating Officer (IO)
    actor SHO as Station House Officer (SHO)
    participant UI as Next.js Frontend (:3000)
    participant API as FastAPI Gateway (:8000)
    participant DB as PostgreSQL + pgvector (:5432)
    participant AI as Gemini Gateway (gemini_client.py)
    participant EXT as External / Mock Intermediaries

    %% Stage 1: Ingestion
    Note over IO, AI: Phase 1: Multimodal Ingestion & Extraction
    IO->>UI: Uploads Gujarati PDF complaint
    UI->>API: POST /ingestion/{case_id} (multipart)
    API-->>UI: 202 Accepted (Background task enqueued)
    API->>AI: generate_text(INGESTION_TRANSCRIPTION_PROMPT, bytes)
    AI-->>API: Returns Original Text + English Translation
    API->>AI: generate_json(EXTRACTION_PROMPT, schema)
    AI-->>API: Extracted entities with confidence scores
    API->>DB: INSERT into complaints & case_entities
    API->>DB: INSERT audit_events ("complaint_processed")

    %% Stage 2: Path Generation
    Note over IO, AI: Phase 2: SOP RAG & Legal Classification
    IO->>UI: Clicks "Generate Investigation Path"
    UI->>API: POST /paths/{case_id}/generate
    API->>AI: embed(complaint_text) -> 768-dim vector
    AI-->>API: Returns query vector
    API->>DB: Cosine distance query: SELECT FROM sop_chunks ORDER BY embedding <=> query_vec LIMIT 5
    DB-->>API: Returns top-5 SOP chunks & BNS legal sections
    API->>AI: generate_json(INVESTIGATION_PATH_PROMPT, SOP chunks, Legal sections)
    AI-->>API: Steps with SOP citations + BNS section recommendations
    API->>DB: INSERT investigation_paths, path_steps, case_sections
    API-->>UI: Displays actionable pathway with blue SOP chips

    %% Stage 3: Legal Request & SHO Gate
    Note over IO, EXT: Phase 3: Legal Request & Dispatch
    IO->>UI: Clicks "Draft Bank Freeze Request"
    UI->>API: POST /requests/{case_id}
    API->>API: Jinja2 renders template with extracted suspect account
    API->>DB: INSERT legal_requests (status='draft')
    IO->>UI: Submits draft for approval
    UI->>API: GET /requests/{id}/readiness
    API-->>UI: Evaluates 6 gates (passes 5/6, awaits SHO approval)
    SHO->>UI: Logs in, reviews draft, clicks "Approve"
    UI->>API: POST /requests/{id}/approve
    API->>DB: UPDATE legal_requests status='approved'
    SHO->>UI: Clicks "Dispatch Notice"
    UI->>API: POST /requests/{id}/dispatch
    API->>EXT: SMTP TLS Dispatch to provider inbox
    API->>DB: UPDATE status='dispatched', INSERT audit_events

    %% Stage 4: Response Analytics & Promotion
    Note over IO, EXT: Phase 4: Response Analytics & Correlation
    EXT->>API: POST /mock/provider/respond/{request_id}
    API->>DB: Parses CSV records into provider_responses
    API->>AI: generate_text(INSIGHT_GENERATION_PROMPT, sample_rows)
    AI-->>API: Actionable intelligence insight bullet points
    API->>API: Correlation matching: provider rows <-> case_entities
    API->>DB: Automatically triggers Path Revision
    IO->>UI: Views correlation panel, clicks "Promote to Case Diary"
    UI->>API: POST /responses/{id}/promote (row_index)
    API->>DB: INSERT ai_citations (source_type='provider_response_row')
    API->>DB: INSERT audit_events ("response_row_promoted")

    %% Stage 5: Summary & Audit
    Note over IO, DB: Phase 5: Versioned Summary & Verification
    IO->>UI: Clicks "Generate Case Summary"
    UI->>API: POST /summaries/{case_id}
    API->>DB: Gathers context: complaints, entities, steps, responses, audit trail
    API->>AI: generate_text(CASE_SUMMARY_PROMPT, full_context)
    AI-->>API: Structured professional case summary
    API->>DB: INSERT case_summaries (version = version + 1)
    API-->>UI: Renders court-ready case summary
```

---

## 3. Deep-Dive Data Flows for Critical Subsystems

---

### Flow A: Multimodal Complaint Ingestion & Language Detection

```
[Uploaded File (PDF / Audio / Image)]
         │
         ▼
[ingestion_service.py: process_complaint()]
         │
         ├───► Reads file bytes & determines MIME type
         │
         ├───► Dispatches to gemini_client.transcribe()
         │     ├── Prompt: INGESTION_TRANSCRIPTION_PROMPT
         │     └── Modality: Handles audio transcription & vision OCR
         │
         ├───► Unicode Range Analysis:
         │     ├── Gujarati code points (\u0a80 - \u0aff) > 5  ──► "gu"
         │     ├── Devanagari code points (\u0900 - \u097f) > 5 ──► "hi"
         │     └── Default                                      ──► "en"
         │
         ├───► Splits Gemini response:
         │     ├── Original Text Section    ──► complaint.raw_text
         │     └── English Translation      ──► complaint.translated_text
         │
         ├───► extraction_service.py: extract_entities()
         │     ├── Prompt: EXTRACTION_PROMPT
         │     ├── Gemini JSON mode (schema-enforced)
         │     └── Returns 11 entity types with confidence scores (0.0 - 1.0)
         │
         ├───► entity_service.py: sync_case_entities()
         │     └── Normalizes raw entities into case_entities table
         │
         └───► audit_service.py: record("complaint_processed")
               └── Commits transaction to PostgreSQL
```

---

### Flow B: SOP RAG Retrieval & Legal Section Mapping

```
[Trigger: User requests Investigation Path]
         │
         ▼
[path_service.py / path_revision_service.py]
         │
         ├───► 1. Query Embedding:
         │     gemini_client.embed(complaint_text)
         │     └── Model: text-embedding-004 (768 dimensions)
         │
         ├───► 2. pgvector Cosine Search:
         │     SELECT * FROM sop_chunks
         │     ORDER BY sop_chunks.embedding <=> query_vector
         │     LIMIT 5;
         │     (Fallback: SQL ILIKE text search if embedding unavailable)
         │
         ├───► 3. Keyword Match on Statutory Codes:
         │     Queries legal_sections for relevant BNS, BNSS, BSA statutes
         │
         ├───► 4. LLM Reasoning Call:
         │     gemini_client.generate_json(INVESTIGATION_PATH_PROMPT)
         │     ├── Model: gemini-2.5-pro (deeper reasoning)
         │     ├── Injected Context: Complaint facts + 5 SOP chunks + Legal codes
         │     └── Output Schema: GeminiPathResponse
         │           ├── crime_type: e.g., 'cyber_fraud'
         │           ├── steps: [title, description, sop_citation, suggested_action_type]
         │           └── sections: [code, section_number, ai_reasoning, confidence]
         │
         └───► 5. Persistence & State Update:
               ├── Deactivates previous active path (if revision)
               ├── INSERT INTO investigation_paths & path_steps
               ├── INSERT INTO case_sections
               └── Updates case_workflow_state.current_stage to 'investigate'
```

---

### Flow C: Forensic Video Analysis & Blockchain-Style Ledger

```
[Surveillance Video File Upload (MP4 / MOV)]
         │
         ▼
[video_service.py: analyze_video_task()]
         │
         ├───► 1. Local Persistence:
         │     Saves to /uploads/evidence/{case_id}/
         │     Ledger: append_ledger_event("ANALYSIS_STARTED")
         │
         ├───► 2. Gemini Files API Streaming:
         │     Uploads video via gemini_client.upload_file()
         │     Polls until status == 'ACTIVE' (max_wait=180s)
         │     Ledger: append_ledger_event("GEMINI_UPLOAD_COMPLETE")
         │
         ├───► 3. Forensic Model Analysis:
         │     gemini_client.generate_json_from_file(VIDEO_FORENSIC_ANALYSIS_PROMPT)
         │     Output: IncidentReport
         │       ├── Summary & Crime Classification
         │       ├── Risk Evaluation: LOW / MEDIUM / HIGH
         │       ├── Detected Entities (Vehicles, Weapons, Persons)
         │       └── Timestamped Timeline: [{"00:15": "Suspect exits vehicle"}, ...]
         │
         ├───► 4. Marker & Timeline Insertion:
         │     - Creates EvidenceMarker rows with start_ms / end_ms
         │     - Creates TimelineEvent rows with cctv_analysis metadata
         │     Ledger: append_ledger_event("INCIDENT_REPORT_GENERATED")
         │
         ├───► 5. Cryptographic Evidence Chain (LedgerService):
         │     For each ledger event:
         │       Prev_Hash = Tail hash of previous audit event
         │       Record_Hash = SHA-256(case_id | event_type | canonical_payload | Prev_Hash)
         │       Signature = HMAC-SHA256(Record_Hash, JWT_SECRET)
         │       Stores {ledger_hash, prev_hash, signature} in audit_events.detail
         │
         └───► 6. Verification API: GET /video/{case_id}/chain/verify
               Walks chain from Genesis (64 zeros), recalculates every hash,
               verifies HMAC signatures. Proves video evidence was not altered.
```

---

### Flow D: Tri-Lingual AI Copilot Query & Citation Provenance

```
[Officer asks question in Hindi / Gujarati / English]
  (e.g., "આ કેસમાં કયા પુરાવા મળ્યા છે?" with X-Lang: "gu")
         │
         ▼
[copilot_service.py: ask_copilot()]
         │
         ├───► 1. Records User Message:
         │     INSERT INTO copilot_messages (role='user', message, lang='gu')
         │
         ├───► 2. Intent Resolution:
         │     Maps to canonical intent (next_action, missing_facts, evidence,
         │     legal_basis, provider_response, or generic)
         │
         ├───► 3. Full Case Context Assembly (8 Sections):
         │     [Case Info] + [Complaints] + [Normalized Entities] +
         │     [SOP Steps] + [Legal Sections] + [Provider Responses] +
         │     [Evidence Markers] + [Last 15 Audit Events]
         │
         ├───► 4. Gemini JSON Mode Generation:
         │     Prompt: COPILOT_SYSTEM_PROMPT (target_language: "Gujarati")
         │     Rules Enforced:
         │       - Absolute grounding: "No grounded answer found" if missing
         │       - Generates authoritative English answer (for official audit)
         │       - Generates localized Gujarati answer (for officer UI display)
         │       - Strictly preserves case IDs, section numbers, phone numbers in Latin
         │
         ├───► 5. Citation Extraction & Storage:
         │     For each returned citation:
         │       provenance_service.create_citation()
         │       └── INSERT INTO ai_citations (source_type, source_id, excerpt, confidence)
         │
         ├───► 6. Assistant Message Persistence:
         │     INSERT INTO copilot_messages (
         │       role='assistant',
         │       message=English_answer,
         │       message_localized=Gujarati_answer,
         │       cited_source_ids=[...]
         │     )
         │
         └───► 7. Frontend Rendering:
               Renders Gujarati markdown in Copilot Drawer with interactive,
               clickable source chips linking to raw complaints, records, or SOPs.
```

---

### Flow E: Fallback Cache Execution Flow (Fault Tolerance)

```
[Any AI Service Request (Extraction, Path, Summary, Copilot)]
         │
         ▼
[gemini_client.py: generate_json() / generate_text()]
         │
         ├───► 1. Compute Input Fingerprint:
         │     Input_Hash = SHA-256(json.dumps({prompt, file_meta, model}))
         │
         ├───► 2. Execution Loop (Up to 3 Attempts):
         │     Try:
         │       Call Google Gemini API with timeout
         │       Parse JSON & validate against Pydantic schema
         │       On Success:
         │         Store in fallback_cache table: (purpose, input_hash, response_json)
         │         Return parsed response
         │     Except Exception:
         │       Wait backoff (0.5s * attempt_number)
         │
         └───► 3. On Complete Network / API Failure:
               SELECT response_json FROM fallback_cache
               WHERE purpose = :purpose AND input_hash = :input_hash;
               ├── If Cached Record Exists:
               │     Logs warning, returns cached response (Zero UI disruption)
               └── If No Cache Exists:
                     Serves deterministic rule-based template or raises clean GenerationError
```

---

## 4. Data Transformation & Schema Evolution Matrix

| Stage | Input Data Format | Processing Engine | Output Data Format | Database Table Written |
|---|---|---|---|---|
| **Ingestion** | Binary (PDF, Audio, Scanned JPG) | Gemini Flash (Multimodal) | Verbatim string + English text | `complaints` |
| **Extraction** | English Complaint Text | Gemini Flash (JSON Mode) | Array of typed entity dictionaries | `extracted_entities`, `case_entities` |
| **RAG Retrieval** | Complaint summary string | `text-embedding-004` + pgvector | Top-5 matched text chunks | None (in-memory read) |
| **Path Generation** | Complaint + SOP chunks + Legal codes | Gemini Pro (JSON Mode) | Structured steps + BNS section tags | `investigation_paths`, `path_steps`, `case_sections` |
| **Notice Drafting** | Extracted entity records | Jinja2 Template Engine | Formatted statutory legal letter | `legal_requests` |
| **Response Ingestion**| Raw CSV / Tabular response | Python CSV Parser + Gemini Flash | Parsed JSONB + AI intelligence bullets | `provider_responses` |
| **Video Analysis** | Raw Video File (MP4) | Gemini Files API + Flash | Incident report + MM:SS timeline | `evidence_markers`, `timeline_events` |
| **Chain of Custody**| Operational event payload | HMAC + SHA-256 Ledger Engine | Linked cryptographic hash block | `audit_events` |
| **Summarization** | Aggregated case state (8 DB domains) | Gemini Flash | Formal Markdown case diary | `case_summaries` (versioned) |

---
*Generated as technical documentation for CrimeOS AI (ERH26_PS_10).*
