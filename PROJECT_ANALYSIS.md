# Crime OS AI — Project Analysis & Strategy Document

**Problem Statement:** ERH26_PS_10 — *Crime OS AI*
**Event:** ERH26 Hackathon
**Document type:** Problem → Solution → Architecture → Feature → Competitive analysis → Gap analysis
**Status of build:** Specification/planning complete; implementation not yet started (see [Reality Check](#12-reality-check--current-build-status))
**Date:** 2026-07-04

---

## 1. Executive Summary

**Crime OS AI is an agentic AI platform that assists police officers across the entire investigation lifecycle** — from ingesting a messy, multilingual complaint to producing an audit-ready case summary. It targets both **cyber** and **conventional** crime.

The core insight: an investigating officer's job is drowning in *documentation and coordination overhead* — transcribing complaints, figuring out which legal sections apply, drafting formal data requests to telecoms/banks, chasing responses, and writing case logs. Each of these is a place where an LLM grounded in the right reference material (SOPs, BNS/BNSS/BSA statutes, LERS templates) can compress hours into minutes **without removing the officer from the decision loop**.

The product's defining principle — and its strongest differentiator for a hackathon judging panel — is **grounding**: every AI output is displayed next to its source (the SOP paragraph, the exact legal section text). This turns "magic AI" into "auditable AI assistant," which is exactly what a law-enforcement buyer requires.

**The golden path (the demo):**
> Complaint ingested (Gujarati PDF / Hindi audio / handwritten image) → entities extracted → crime classified + BNS/BNSS/BSA sections cited → SOP-grounded investigation path suggested → legal request auto-drafted & dispatched via email → mock provider response parsed into insights → one-click versioned case summary with full audit trail.

---

## 2. Problem Statement (Detailed)

### 2.1 The operational reality
Investigators handle both cyber and conventional crime under three compounding pressures:

1. **Time scarcity** — an IO juggles many active cases; every case has procedural deadlines.
2. **Documentation burden** — FIRs, case diaries, legal notices, provider requests, and summaries are largely manual and repetitive.
3. **Knowledge load** — the officer must correctly map facts to the *new* criminal codes (BNS/BNSS/BSA, which replaced IPC/CrPC/Evidence Act), know the correct SOP for each crime type, and know the correct legal-request format for each service provider.

### 2.2 Specific pain points the platform attacks
| Pain point | Consequence today | Where AI helps |
|---|---|---|
| Complaints arrive in mixed formats (PDF, audio, handwritten) and 3 languages | Manual transcription/translation; delay & error | Multimodal + multilingual ingestion |
| Facts must be mapped to correct legal sections | Errors, inconsistency, dependence on legal advisor | Grounded classification with cited sections |
| Officers don't always know the optimal next investigative step | Missed evidence, slow cases | SOP-grounded investigation path |
| Legal requests to telecom/bank/platform are manual, formatted per provider | Slow, error-prone, non-standard | Template-driven auto-generation + dispatch |
| Provider responses (CDRs, transaction dumps) are large and unstructured | Insights buried, patterns missed | Automated parsing + insight callouts |
| Case logs & summaries written by hand | Time sink; poor auditability | Auto-generated versioned summaries + audit trail |

### 2.3 Constraints that shape the solution
- **Non-technical end users** — the IO is not a data scientist. UX must be forgiving, bilingual, and officer-in-the-loop.
- **Legal defensibility** — anything an officer acts on must be traceable to a source. Hence grounding + append-only audit trail are product requirements, not nice-to-haves.
- **Regulatory reality** — real integration with LERS/CCTNS/telecoms/banks is gated. The prototype therefore uses *mock* external systems that are architecturally honest (separate routers presented as external services).

---

## 3. The Solution

### 3.1 Product concept
An **agentic** assistant: not a chatbot, but a workflow engine where each stage produces a structured, grounded, editable artifact that feeds the next stage. The officer approves/edits at each hop, so the AI accelerates rather than replaces judgment.

### 3.2 The four capability pillars (mapped to evaluation criteria)

**Pillar 1 — Multimodal & Multilingual Ingestion**
Ingests PDF, image (incl. handwriting), and audio in Gujarati/Hindi/English. Uses Gemini's native multimodal capability to transcribe/OCR, detect language, translate to English while preserving names/numbers verbatim, then extract structured entities (complainant, accused, phone numbers, bank accounts, amounts, dates, locations) into a case record with per-entity confidence. Presented as a **side-by-side original-vs-extracted** review screen the officer can correct.

**Pillar 2 — Grounded Investigation Paths & Legal Sections**
RAG over SOP documents (pgvector cosine retrieval) + a curated BNS/BNSS/BSA legal dataset. Produces: (a) a crime classification, (b) suggested legal sections **with reasoning and the actual section text shown**, and (c) an ordered, step-by-step investigation path where **each step cites the SOP paragraph it came from** (visible in a citation popover). This is the intelligence showcase.

**Pillar 3 — Automated Legal Requests**
Jinja2 LERS-style templates (telecom CDR, bank freeze/KYC, platform data). A path step like "Obtain CDR" pre-fills a request from extracted entities → draft → approval → **real SMTP dispatch to a demo mailbox** → status tracking (draft → approved → dispatched → responded). A mock provider endpoint returns a crafted CSV/PDF on demand (demo control).

**Pillar 4 — Response Analytics, Summaries & Audit**
Parses provider responses into structured JSON, generates insight callouts ("3 transactions to account X within 1 hour of the incident"), and produces **one-click, versioned** case summaries. Every state change writes an append-only audit event, rendered as a case timeline.

### 3.3 Design principles (the "why we'll win" list)
1. **Grounding over magic** — every AI claim shows its source.
2. **Officer-in-the-loop** — editable extraction, approvable requests.
3. **The demo cannot die** — every AI call has a deterministic fallback (cached last-good response or template).
4. **Audit is a feature, not plumbing** — append-only trail, versioned summaries.
5. **Integration readiness signalled** — mock CCTNS/eGujcop endpoints + auto-generated Swagger docs.

---

## 4. Architecture

### 4.1 System boundary
```
[Next.js :3000] --HTTP/JSON--> [FastAPI :8000] --> [PostgreSQL 16 + pgvector :5432]
                                    |--> Gemini API (LLM, vision, audio, embeddings)
                                    |--> SMTP (legal request dispatch → demo mailbox)
                                    |--> /mock/provider  (telecom/bank/platform responses)
                                    |--> /mock/cctns     (eGujcop/CCTNS mock API)
```
Key rule: **the frontend never touches Gemini or the DB.** All intelligence lives behind FastAPI. Mock "external" systems are routers *inside the same app* — zero extra deploys, but demoed as external services.

### 4.2 Tech stack & rationale
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Fast iteration, file routing, judge-visible polish |
| UI | Tailwind + shadcn/ui | Accessible components, consistent look fast |
| Backend | FastAPI (Python 3.11+) | Native AI-pipeline fit; auto Swagger = "integration readiness" |
| Database | PostgreSQL 16 + pgvector | One store for relational **and** RAG embeddings |
| ORM | SQLAlchemy 2.0 + Alembic | Typed models, quick migrations |
| LLM | Gemini 2.5 Flash (default) / Pro (paths) | Free tier, native multimodal, strong Hindi/Gujarati |
| Embeddings | Gemini `text-embedding-004` (768-dim) | Same key, free tier |
| ASR/OCR | Gemini audio/vision (primary); faster-whisper/Tesseract (stubbed fallback) | Fewer moving parts; Gemini handles handwriting well |
| Email | SMTP (Gmail app-password) → demo inbox | Real, visible dispatch |
| Background jobs | FastAPI `BackgroundTasks` | No Celery/Redis complexity |
| Auth | JWT + 3 seeded users (IO/SHO/LEGAL) | Enough for RBAC bonus |

### 4.3 Layering discipline (enforced by `agents.md`)
- **Routers are thin** — validate input, call one service, return a schema. No SQL/Gemini in routers.
- **`gemini_client.py` is the single Gemini gateway** — retries, timeouts, JSON mode, fallback cache live there once.
- **All prompts in `prompts.py`** as named constants.
- **Every AI mutation writes an audit event** in the same transaction.
- **Frontend fetches only through `lib/api.ts`.**
- **Every AI call has a deterministic fallback.**
- **Seeds are sacred** — one command yields a fully demo-ready DB.

This discipline matters: it keeps AI-generated code coherent across a fast hackathon build and prevents the classic "prompt strings scattered everywhere / demo dies on a rate limit" failure modes.

### 4.4 Data model (highlights)
UUID PKs throughout. Core aggregates: `cases`, `complaints`, `extracted_entities`, `legal_sections` + `case_sections`, `sop_documents` + `sop_chunks (VECTOR(768))`, `investigation_paths` + `path_steps`, `legal_requests`, `provider_responses (JSONB)`, `case_summaries (versioned)`, `audit_events (append-only)`, `evidence_files (bonus)`.
Invariants: `audit_events` never updated/deleted; `case_summaries` never overwritten (new version each time). These two invariants *are* the auditability story.

### 4.5 Async & reliability pattern
Long AI ops (ingestion, path generation) create a record with `status='processing'`, run work in `BackgroundTasks`, and the frontend polls every 2s. Gemini calls: 2 retries w/ backoff → fallback cache → else `GenerationError`. SMTP failures never 500 — request is marked dispatched with a `smtp_failed_demo_mode` note so the demo continues.

---

## 5. Feature Inventory

### In scope (MVP)
- Complaint ingestion: PDF / image / audio; Gujarati / Hindi / English
- Structured entity extraction (editable, confidence-scored)
- Crime classification + BNS/BNSS/BSA suggestion with cited reasoning
- SOP-grounded investigation path with visible citations
- Legal request auto-generation (telecom / bank / platform) + SMTP dispatch + status tracking
- Mock provider response ingestion + parsing
- Case dashboard, auto-generated timeline/log, one-click summary
- Audit trail + summary version history

### Bonus (if golden path is solid)
- Role-based access (IO / SHO / Legal Advisor views + approval queues)
- Mock CCTNS/eGujcop API + "Sync to CCTNS" button
- Evidence image upload with AI tagging

### Explicitly out of scope
Real LERS/CCTNS integration, real telecom/bank dispatch, production auth/SSO, offline-first/PWA, mobile apps, model fine-tuning, languages beyond the three, deployment hardening. *(Scope walls are a strength — they keep the demo focused.)*

---

## 6. Evaluation-Criteria Coverage

| Criterion | How Crime OS AI answers it | Strength |
|---|---|---|
| Multimodal/multilingual ingestion accuracy | Gemini multimodal + 3 languages + side-by-side review | ★★★★☆ |
| Investigation-path & legal-section usefulness | RAG over SOPs + BNS/BNSS/BSA, inline citations | ★★★★★ (the differentiator) |
| Reliable request generation & dispatch | Templates + real SMTP + status tracker | ★★★★☆ |
| Response analytics & summaries | Parsed data + insight callouts + versioned summaries | ★★★★☆ |
| Usability & integration readiness | Bilingual UI, RBAC, mock CCTNS, Swagger | ★★★★☆ |

Every functional requirement in PS-10 maps to a concrete, demoable feature. The strongest coverage is on the *grounded intelligence* criterion, which is also the hardest for competitors to fake convincingly.

---

## 7. Competitor & Landscape Analysis

There is **no direct competitor** that does this exact end-to-end India-specific workflow (multimodal Indian-language complaint → BNS/BNSS/BSA grounding → LERS-style provider requests → summary). The competition is a *fragmented set of point solutions* plus government platforms. That fragmentation is the opportunity.

### 7.1 Government / India-context platforms
- **CCTNS (Crime & Criminal Tracking Network System)** — the national FIR/records backbone. It is a *system of record*, not an AI assistant. Crime OS AI positions as an **intelligence layer on top of CCTNS** (hence the mock-CCTNS sync), not a replacement. Complementary, not competing.
- **MahaCrimeOS AI (Maharashtra + Microsoft, Dec 2025)** — an AI copilot for cybercrime being rolled out from Nagpur to all ~1,100 Maharashtra stations. This is the closest philosophical peer and validates the entire premise. Differences: MahaCrimeOS is cybercrime-focused and state-specific; Crime OS AI covers **both cyber and conventional** crime and centers on **SOP-grounded paths + automated LERS-style legal requests**, which is a workflow angle rather than a copilot/chat angle.
- **CMAPS / AMPED FIVE (Delhi Police)** — predictive policing / CCTV image enhancement. Different problem (surveillance & forensics), not case-lifecycle documentation.

### 7.2 Western commercial players (adjacent, not India-ready)
- **Axon Draft One** — AI police *report* writing (from body-cam audio), ChatGPT-based. Huge adoption (Fresno PD used it 17,000+ times by Q3 2025) but narrow: it drafts one document. It does **not** do multilingual complaint ingestion, legal-section grounding to Indian statutes, or provider-request automation. Also under active ACLU criticism for transparency — which *validates our grounding-first, audit-first design as the differentiator.*
- **Truleo (Field Notes)** — Amazon-Bedrock-based report dictation, positions as the "ethical" alternative. Same narrow scope as Axon.
- **Palantir Gotham** — heavyweight intelligence/data-fusion for large agencies. Powerful but expensive, integration-heavy, and not a lightweight officer workflow tool. Different market tier.

### 7.3 Positioning matrix

| Capability | Crime OS AI | CCTNS | MahaCrimeOS | Axon Draft One | Truleo | Palantir |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Multimodal complaint ingestion | ✅ | ❌ | ~ | ~ (audio only) | ~ (audio only) | ~ |
| Indian-language (Guj/Hin/Eng) | ✅ | ~ | ✅ | ❌ | ❌ | ~ |
| BNS/BNSS/BSA legal grounding | ✅ | ❌ | ~ | ❌ | ❌ | ❌ |
| SOP-grounded investigation paths | ✅ | ❌ | ~ | ❌ | ❌ | ~ |
| Automated provider legal requests | ✅ | ❌ | ❌ | ❌ | ❌ | ~ |
| Response analytics + insights | ✅ | ❌ | ~ | ❌ | ❌ | ✅ |
| Versioned summaries + audit trail | ✅ | ~ | ~ | ~ | ~ | ✅ |
| Officer-in-the-loop, grounded citations | ✅ | n/a | ? | ❌ (criticized) | ~ | ~ |
| Lightweight / station-deployable | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

✅ core strength · ~ partial/unclear · ❌ absent

### 7.4 Why Crime OS AI wins *for this hackathon*
1. **End-to-end lifecycle in one flow** — competitors solve one slice; the golden path shows the whole arc.
2. **India-native grounding** — BNS/BNSS/BSA + LERS + Indian languages is exactly what an India judging panel rewards and what Western tools structurally lack.
3. **Grounding + audit as first-class** — directly answers the #1 criticism aimed at Axon-class tools.
4. **Integration-ready framing** — mock CCTNS/eGujcop + Swagger signals it slots into existing infrastructure rather than replacing it.

---

## 8. Gap Analysis — What Could Make It the Winning Solution

The concept is strong; these are the honest gaps and the highest-leverage improvements.

### 8.1 Gaps in the current plan
| Gap | Risk | Recommended action |
|---|---|---|
| **Nothing is built yet** (only docker+pgvector init) | Highest risk — a great plan scores zero without a running golden path | Ruthlessly execute Phase 1→5; treat bonuses as truly optional |
| **RAG quality depends on SOP corpus** | Thin/low-quality SOPs → weak, generic paths (the #1 scored criterion) | Curate 3–4 *real, well-structured* SOPs; chunk by heading; verify citations read cleanly |
| **Legal dataset accuracy** | Wrong BNS section on stage = credibility loss in front of legal-savvy judges | Curate ~60 sections carefully; have a legal-aware person sanity-check the demo cases |
| **Multilingual accuracy is claimed, not proven** | Judges may test with their own file | Pre-test the exact demo files; keep fallback-cached good outputs |
| **Insight generation can hallucinate patterns** | "Suspicious pattern" that's wrong undermines trust | Ground insights in parsed structured data; show the rows the insight is derived from |
| **No evaluation/accuracy numbers** | "How accurate is it?" is an obvious judge question | Prepare a small measured accuracy claim on the demo dataset (even n=10) |

### 8.2 Enhancements that would raise the ceiling
1. **Cross-entity link analysis** — a simple graph view connecting phone numbers / accounts / people across the case (and ideally across cases). Cheap to fake with the extracted entities, very high "wow" per hour. Moves the product from "document assistant" toward "intelligence platform."
2. **Confidence + provenance UI everywhere** — a consistent "AI-suggested · source: [SOP §3.2]" chip. This is the visual signature that separates it from Axon-style black boxes.
3. **Deadline/procedural-clock awareness** — BNSS introduces timelines; a "next action due" nudge would resonate strongly with officers and judges.
4. **A measured accuracy slide** — even a small labelled test set turns a subjective claim into evidence.
5. **One genuinely conventional-crime demo case** (e.g., theft/harassment) alongside the cyber-fraud case — proves the "both cyber and conventional" claim the PS explicitly asks for. Currently the plan's strongest demo is cyber-fraud; a second case type de-risks the "is this just a fraud tool?" question.
6. **Explicit privacy/DPDP framing** — one slide on data handling, redaction, and audit answers the governance question that always comes up with police AI.

### 8.3 Traps to avoid (from the plan's own risk model)
- Don't build Phase N+1 before Phase N's checkpoint passes.
- Don't cut the golden path, SOP citations, or the audit timeline (the plan's Cut List correctly protects these).
- Don't let prompts sprawl outside `prompts.py` or Gemini calls outside `gemini_client.py` — coherence collapses fast otherwise.

---

## 9. Risk Register (condensed)
| Risk | Likelihood | Impact | Mitigation (already designed) |
|---|---|---|---|
| Gemini rate limit / API failure mid-demo | Med | High | Fallback cache per (purpose, input-hash); serialized calls |
| SMTP fails live | Med | Med | Mark dispatched w/ note; never 500 |
| Weak SOP/legal grounding | Med | High | Curate corpus; verify citations |
| Time runs out | High | High | Phase-gated build + explicit Cut List |
| Empty/broken demo DB | Low | High | Sacred one-command seed producing 2 pre-baked cases |

---

## 10. Verdict

**Is it better than existing solutions?** For the specific target — India-context, full-lifecycle, both crime types, grounded and auditable — **yes, in concept there is no direct equal.** The nearest peer (MahaCrimeOS AI) validates the premise but is narrower (cyber-only, state copilot); Western tools (Axon, Truleo) solve a single slice and lack Indian-language/statute grounding; CCTNS/Palantir sit at different layers.

**What's missing to actually win?** Execution and evidence. The plan is unusually disciplined and complete, but **the differentiator is grounded, cited, audit-ready intelligence — and that only counts if the golden path runs flawlessly with a high-quality SOP/legal corpus and at least one convincing conventional-crime case.** Add a lightweight cross-entity link view and a measured-accuracy claim, and the concept converts into a winning demo.

---

## 11. Reality Check — Current Build Status

Per `context/progress_tracker.md`, **only one item is complete**: `docker-compose.yml` (Postgres + pgvector) and the `init.sql` that enables the vector extension. Everything else — FastAPI skeleton, models, Gemini client, seeds, the entire frontend, and all four capability pillars — is **specified but not yet implemented.**

This document therefore describes the **designed** solution. The single most important next action is to execute **Phase 1** (foundation + demo-ready seeded DB) and drive straight down the golden path. The quality of the planning artifacts (`context/*`) is a genuine asset: the architecture, code standards, and phase gates are strong enough to keep an AI-assisted build coherent. The gap is purely between *plan* and *running code*.

---

## Sources
- [Maharashtra police get an AI copilot to fight cybercrime — Microsoft Source Asia](https://news.microsoft.com/source/asia/features/a-race-against-time-maharashtra-police-get-an-ai-copilot-to-fight-cybercrime/)
- [Digital Transformation of Justice: Integrating AI in India's Judiciary and Law Enforcement — PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2106239&reg=3&lang=2)
- [AI in Law Enforcement — Vision IAS](https://visionias.in/current-affairs/monthly-magazine/2026-01-28/security/ai-in-law-enforcement)
- [Draft One — Axon](https://www.axon.com/products/draft-one)
- [How AI is being used by police departments to help draft reports — CNN Business](https://www.cnn.com/2025/08/12/tech/ai-police-reports-axon)
- [ACLU Slams AI Police Reports, and Axon in Particular — GovTech](https://www.govtech.com/biz/aclu-slams-ai-police-reports-and-axon-in-particular)
- [Using AI to Write Police Reports — COPS Office, US DOJ](https://cops.usdoj.gov/html/dispatch/01-2025/ai_reports.html)
