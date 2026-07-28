# Project Overview — Crime OS AI (ERH26_PS_10)

## What It Is
Crime OS AI is an **agentic AI platform for intelligence-led police investigations** covering both cyber and conventional crime. It assists officers across the full investigation lifecycle: multimodal complaint ingestion ➡️ AI-suggested investigation paths (grounded in SOPs) ➡️ automated legal requests to service providers ➡️ response analytics ➡️ auto-generated case logs and summaries.

Built for the **ERH26 hackathon, Problem Statement 10**. This platform is a fully realized prototype optimized for demonstrating: (1) a flawless, comprehensive 5-to-7 minute live demo, (2) visible, grounded AI intelligence with clear provenance, and (3) complete coverage of the hackathon evaluation criteria.

---

## Target Users
* **Investigating Officer (IO)** — Primary user. Non-technical. Files complaints, reviews entity warning highlights, follows suggested paths, uploads evidence, and dispatches requests.
* **SHO (Station House Officer)** — Supervises cases, approves legal requests prior to dispatch.
* **Legal Advisor** — Reviews and audits suggested statutory sections and request templates for legal compliance under BNS/BNSS/BSA.

---

## The Golden Path (The Demo Workflow)

The application features two seeded demo cases:
1. **Case 1 (UPI Fraud intake)**: Guides the user through uploading a Gujarati PDF complaint, transcriber translation, confidence highlighting, human-in-the-loop entity verification, and path generation.
2. **Case 2 (Social Media Harassment & Identity Theft)**: Pre-seeded with advanced investigation data to showcase Phase 8–11 intelligence capabilities (Video reports, OSINT risk panels, and Timeline agent) without requiring manual data setup.

### The end-to-end flow:
1. **Ingest**: Officer uploads a complaint (Gujarati PDF, Hindi audio, or photo of a handwritten FIR). System transcribes/OCRs, translates, and extracts structured entities (phone numbers, bank accounts, dates, names, amounts).
2. **Classify & Suggest**: AI classifies the crime type, cites relevant BNS/BNSS/BSA sections with cited reasoning, and proposes a step-by-step investigation path grounded in SOP documents (pgvector vector lookup with popover citations).
3. **Act**: Officer triggers a path step to auto-generate a legal request (e.g. bank freeze letter, telecom CDR request). System runs pre-dispatch readiness audits (checklist), submits for SHO approval, dispatches via SMTP, and tracks responses.
4. **Analyze & Summarize**: Ingests provider responses, highlights suspicious transaction correlations, prompts OSINT scans for footprint analysis, analyzes CCTV video files, logs notes on the chronological case timeline, and compiles a version-controlled case summary.
5. **Audit**: The entire flow is logged inside an append-only, tamper-evident audit timeline with actor-attributed User IDs.

---

## Evaluation Criteria Mapping (Why We Build What We Build)

| Criterion | Our Answer |
| :--- | :--- |
| **Multimodal/multilingual ingestion accuracy** | Gemini-powered OCR/Transcription/Translation + side-by-side verification UI with Warning Amber flags for low-confidence data. |
| **Investigation-path & legal-section usefulness** | pgvector RAG database matching complaint facts directly to seeded SOP documents; interactive citations show exact source excerpts. |
| **Reliable request generation & dispatch** | Pre-dispatch readiness checklists + Jinja2 templates + SHO approval gates + SMTP dispatch. |
| **Response analytics & summaries** | Response parsing + insight tables + OSINT scans + case timeline + versioned summaries. |
| **Usability & integration readiness** | High-contrast bilingual helper text, distinct user roles (IO/SHO/Legal), and an active Mock CCTNS API with a "Sync to CCTNS" action. |

---

## Implemented Feature Set (In-Scope)

### 1. Ingestion & Entity Management
* **Multimodal Intake**: Handles PDF, audio (MP3/WAV/M4A), and image uploads.
* **Side-by-Side Review Panel**: Original text and translation rendered side-by-side with an editable entity grid.
* **Warning Amber Indicators**: Visual highlights around low-confidence names, dates, or numbers requiring human review.
* **Normalized Key Entities**: Entity pivot grids mapping normalized phone numbers, emails, locations, and bank accounts.

### 2. Grounded SOP Paths & Legal Audit
* **Adaptive SOP Steppers**: Actionable steps derived from RAG lookups with visible popup citations.
* **Path Revision History**: Append-only tracker of path changes triggered by new case inputs or provider responses.
* **BNS/BNSS/BSA Citations**: Proposes statutory sections with direct text references.
* **Legal Advisor Auditing**: Verified / Flagged action indicators for legal sections.

### 3. Case Command Center
* **Workflow Spine**: Top navigation status tracking showing active, completed, and blocker states.
* **Next Best Action Recommendations**: A dynamic guide that keeps the officer oriented toward the next crucial step.
* **Case-Scoped Cited Copilot**: Grounded chat drawer supporting predefined helper queries with click-to-cite source chips.

### 4. Legal Request (LERS) Workflows
* **Jinja2 Nodal Request Drafting**: Drafts bank freeze, telecom CDR, and social platform requests.
* **Nodal Request Readiness Checklists**: Validation checklist blocking dispatch if nodal emails, validated entities, or legal grounds are missing.
* **Approval Gates**: Status tracking loop (DRAFT ➡️ APPROVED ➡️ DISPATCHED ➡️ RESPONDED).
* **Mock Provider Router**: Simulates responses and transaction logs for testing without external deps.

### 5. OSINT Digital Footprint Enrichment
* **Footprint Profiling**: Scans phone/email entities to report data breaches and social media profile existence.
* **Unconfirmed Pivots**: Extracts related emails, handles, and phone numbers from bio pages, giving the officer one-click confirm/ignore options.
* **Dossier Export**: Downloads structured text reports detailing all scan sources and confidence scores.

### 6. CCTV Pinning & Timeline Agent
* **Case Timeline**: Integrates AI forensic events, CCTV frames, and manual officer notes in chronological order.
* **Officer Diary Notes**: Direct input adding manual timestamped updates.
* **CCTV Frame Pinning**: Pin images, locations, and descriptions to timeline events.

### 7. Video Evidence Workspace
* **Case-Scoped Uploads**: MP4/MOV uploads with background progress polling.
* **Forensic Event Timeline**: Gemini-analyzed video event logs with clickable seeking capabilities.
* **Cryptographic Evidence Registry**: SHA-256 tamper-evident checksums coupled with actor-attributed chain of custody logs.

### 8. Audit Trails & Summaries
* **Versioned Summaries**: Generates case diaries and case summaries that log edits across versions without deletion.
* **Immutable Audit Trail**: Append-only transactional event log records all actions with user credentials.

### 9. Multilingual Support (EN / HI / GU)
* **Hybrid Two-Tier i18n**: Tier 1 translates static UI chrome via typed dictionaries (`lib/i18n/{en,hi,gu}.ts`) with silent English fallback for missing keys; Tier 2 translates AI-generated case content on demand via a backend `/translate` service (Gemini-backed, in-memory cache, never persisted).
* **Language Toggle**: Topbar control persists preference to `localStorage`; the DB remains the authoritative English source.
* **Status**: Implemented (Phase 12, 2026-07-28) — see `context/multilingual_merge_plan.md`. Phase 8–11 UI strings fall back to English until keyed in the dictionaries.

---

## Design System: Ferrari Command Center Aesthetic
* **Surfaces**: Carbon-black `#0b0b0b` page background, warm off-white `#fffaf0` text, and deep charcoal `#121212` cards.
* **Font**: Space Grotesk layout typography.
* **Accents**:
  * **Ferrari Red (`#ff2800`)**: Interactive actions, active tabs, and primary buttons. Used selectively to establish strong visual hierarchy.
  * **Emerald Green (`#00e676`)**: Signifies completed tasks, verified sections, and synchronized items.
  * **Warning Amber (`#ffab00`)**: Low-confidence alerts, readiness errors, and blocker warnings.
  * **Electric Blue (`#00b0ff`)**: Citation badges, SOP grounding links, and Copilot source tags.

---

## Strictly Out of Scope (Excluded)
* Real production CCTNS / eGujcop / LERS api integrations (mock routes only).
* Real dispatch to actual telecom / bank servers (mailboxes and response templates are simulated).
* Production OAuth/SSO auth systems or complex user administration interfaces.
* Production deployment scaling (optimized for local dev/localhost presentation).
* Multi-lingual support beyond Gujarati, Hindi, and English.
