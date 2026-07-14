# Project Overview — Crime OS AI (ERH26_PS_10)

## What It Is
Crime OS AI is an **agentic AI platform for intelligence-led police investigations** covering both cyber and conventional crime. It assists officers across the full investigation lifecycle: multimodal complaint ingestion → AI-suggested investigation paths (grounded in SOPs) → automated legal requests to service providers → response analytics → auto-generated case logs and summaries.

Built for **ERH26 hackathon, Problem Statement 10**. This is a *prototype optimized to win a hackathon*, not a production system. Every decision favors: (1) a flawless 5-minute demo, (2) visible AI intelligence, (3) evaluation-criteria coverage.

## Target Users
- **Investigating Officer (IO)** — primary user. Non-technical. Files complaints, follows suggested paths, dispatches requests.
- **SHO (Station House Officer)** — supervises cases, approves legal requests.
- **Legal Advisor** — reviews suggested legal sections and request drafts.

## The Golden Path (the demo, memorize it)
This exact flow must never break. Everything else is secondary:

1. **Ingest**: Officer uploads a complaint (PDF in Gujarati / audio in Hindi / photo of a handwritten FIR). System transcribes/OCRs, translates, and extracts structured entities (complainant, accused, phone numbers, bank accounts, incident type, date, amounts).
2. **Classify & Suggest**: AI classifies the crime type, cites relevant **BNS/BNSS/BSA sections** with confidence, and proposes a **step-by-step investigation path** grounded in SOP documents (RAG citations visible in UI).
3. **Act**: Officer clicks a suggested step → system **auto-generates a legal request** (e.g., CDR request to a telecom, freeze request to a bank) using LERS-style templates, pre-filled from extracted entities → dispatches via email → tracks status.
4. **Analyze & Summarize**: Mock provider response arrives → system parses it, surfaces insights (e.g., "3 transactions to account X within 1 hour of incident") → **one-click case summary** with full audit trail and version history.

## Evaluation Criteria Mapping (why we build what we build)
| Criterion | Our answer |
|---|---|
| Multimodal/multilingual ingestion accuracy | Gemini multimodal (PDF/image/audio) + Gujarati/Hindi/English, side-by-side original vs. extracted view |
| Investigation-path & legal-section usefulness | RAG over SOPs + BNS/BNSS/BSA dataset, citations shown inline |
| Reliable request generation & dispatch | Template-driven generation + real SMTP dispatch + status tracker |
| Response analytics & summaries | Parsed mock provider data + insights + one-click summary |
| Usability & integration readiness | Clean Hindi/English UI, role-based views, mock CCTNS API endpoint |

## IN SCOPE (MVP)
- Complaint ingestion: PDF, image (JPG/PNG), audio (MP3/WAV/M4A); languages: Gujarati, Hindi, English
- Structured entity extraction into a case record
- Crime classification + BNS/BNSS/BSA section suggestion with cited reasoning
- SOP-grounded investigation path suggestions (RAG with visible citations)
- Legal request auto-generation (telecom CDR, bank freeze/KYC, platform data request) + email dispatch + status tracking
- Ingestion & parsing of **mock** provider responses (CSV/PDF we craft ourselves)
- Case dashboard, case timeline/log (auto-generated), one-click case summary
- Audit trail + summary version history
- **Bonus (build if golden path is solid):** role-based access (IO/SHO/Legal Advisor), mock CCTNS/eGujcop API, evidence image upload with AI tagging

## NEXT PRODUCT LAYER (Phase 8 — build only after the MVP checkpoint)
These features turn the completed golden path into a coherent investigation workspace. They remain localhost/demo-safe, use the existing FastAPI + PostgreSQL + pgvector stack, and do not introduce new external integrations.

- Unified Case Command Center with a visible workflow spine and one next-best action
- Adaptive investigation paths with revision history, branches, blockers, and change explanations
- Case entity intelligence: normalized people, phones, accounts, IPs, locations, evidence, and related-case pivots
- Evidence workspace with transcript/media review, source timestamps, entity links, and “add to case” actions
- Case-scoped investigation copilot with source citations, deterministic fallback, and audit logging
- Pre-dispatch legal quality gate that validates required entities, legal basis, date ranges, approvals, and recipient data
- Explainable provider-response correlations that connect flagged rows back to entities, evidence, and path steps
- Structured case diary views that assemble facts, actions, decisions, and citations without replacing the append-only audit trail

## STRICTLY OUT OF SCOPE (do not build, do not discuss building)
- Real LERS integration, real CCTNS/eGujcop integration (mock only)
- Real dispatch to actual telecoms/banks (demo mailboxes only)
- Production auth (OAuth/SSO), password reset flows, user management UI
- Offline-first / PWA sync (mention in docs as roadmap only)
- Mobile apps, notifications, real-time collaboration
- Fine-tuning models, training custom NER — Gemini prompting only
- Languages beyond Gujarati/Hindi/English
- Deployment hardening, horizontal scaling, K8s

## Non-Negotiables
- The golden path must run end-to-end on localhost with **zero manual DB fiddling**.
- Every AI output shows **its source** (SOP citation, legal section text) — judges reward grounded AI over magic.
- Seed data exists so the app never looks empty.
- New AI features must clearly distinguish officer-entered facts, extracted facts, and AI suggestions.
- No AI feature may silently perform an external action; dispatch and synchronization remain explicit officer actions with role checks.
