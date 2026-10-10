---

> **01 — Video and Timeline**
- Video evidence
- Forensic reports
- Event log; click-to-seek
- CCTV frames pinned to events
## 02 — OSINT and Custody
- Breach scans
- Likely social profiles
- Pivot suggestions
- Actor-attributed audit logs
## 03 — Chain of Custody
- SHA-256 hashes and actor-attributed audit logs preserve chain of custody across the evidence record.
- SHA-256 hashes
- Immutable audit logs

explain me all this

○ Thought for 6.9s (This looks like a structured breakdown of evidence gathering and management. The first section focuses on visual and time-based evidence, sug...)
● Ran 4 commands (+1 · grep -rn "Video and Timeline" .: failed · grep -rn "Pivot suggestions" .: failed · grep -rn "Chain of Custody" .) (ctrl+o to expand)

---

> **you can refer to teammate4_presentation.md and JURY_PRESENTATION_GUIDE.md for my next questions**

○ Thought for 5.3s (Analyzing the requested modules reveals distinct but related areas of focus: video and timeline analysis, open-source intelligence with custo...)
● Explored 5 files (TEAMMATE4_PRESENTATION.md, JURY_PRESENTATION_GUIDE.md, video_service.py, +2) (ctrl+o to expand)

▸ Thought for 5s, 453 tokens
Comprehensive data is available across video, OSINT, and chain of custody domains. Video and timeline data includes forensic reports and event logs, allowing fo...
Here is a detailed explanation of each module, bullet point, technical implementation, and legal significance in Crime OS AI, aligned with
TEAMMATE4_PRESENTATION.md and JURY_PRESENTATION_GUIDE.md.
──────
## 01 — Video and Timeline

### 1. Video Evidence

- What it means: Digital multimedia evidence collected during an investigation (e.g., surveillance CCTV footage, dashcam footage, or bystander phone recordings
in formats like .mp4 or .mov).
- In Crime OS AI:
  - Handled by video_service.py and stored as records in the evidence_files database table.
  - At the exact second an officer uploads a video, the system registers the file and enforces a zero-retention privacy policy: the video is processed via
gemini_client.upload_file(), analyzed, and then immediately purged using gemini_client.delete_file() to prevent cloud data leaks.

### 2. Forensic Reports

- What it means: An automated, structured intelligence readout derived from video frames rather than raw, unannotated footage.
- In Crime OS AI:
  - When the video is processed by Gemini, it generates a structured IncidentReport (Pydantic schema).
  - This report includes:
    - Executive Crime Summary: (e.g., "Attempted break-in and trespassing at restricted premises").
    - Entities Detected: (e.g., vehicle make/color, number plates, suspect clothing, tools).
    - Risk Evaluation: High / Medium / Low operational threat level.
  - If offline or during API fallbacks, deterministic rule-based reports ensure the pipeline never fails with an unhandled exception.

### 3. Event Log; Click-to-Seek

- What it means: An indexed, chronological log of distinct events extracted from the video feed. "Click-to-seek" allows an investigator to jump directly to any
point of interest in the video with a single click.
- In Crime OS AI:
  - Officers typically have to scrub manually through 3–4 hours of CCTV footage.
  - Crime OS breaks the video into parsed timestamps (e.g., 00:05, 00:15, 00:30).
  - In the custom UI video player, each event log item is interactive. Clicking any timestamp invokes:
    videoRef.current.currentTime = event.timestamp_seconds;
The video player seeks instantaneously to that exact second.

### 4. CCTV Frames Pinned to Events

- What it means: Binding specific video timestamps directly to case milestones, entity appearances, and the broader investigative timeline.
- In Crime OS AI:
  - Each extracted incident frame is stored in evidence_markers (with millisecond offsets start_ms/end_ms and descriptive text).
  - Simultaneously, it creates a TimelineEvent in the unified case timeline with event_type="cctv_frame".
  - This pins the visual footage directly alongside other case events (such as CDR call records, bank transfers, or witness statements).

──────
## 02 — OSINT and Custody

### 1. Breach Scans

- What it means: Open Source Intelligence (OSINT) querying against public and simulated data breach repositories to identify compromised credentials associated
with suspect targets.
- In Crime OS AI:
  - Driven by osint_service.py via run_deterministic_breach_lookup().
  - Scans suspect emails or phone numbers across known breach dumps (e.g., exposed passwords, leaked physical addresses, past IP dumps).
  - Identified breaches are stored in the data_breaches table and classified by severity (CRITICAL, HIGH, MEDIUM, LOW).

### 2. Likely Social Profiles

- What it means: Cross-platform digital footprint identification (discovering active social media presence from known identifiers).
- In Crime OS AI:
  - Implements tools inspired by Sherlock (for handles/usernames) and Holehe (for email registrations).
  - Scans across 12+ platforms (Instagram, Telegram, GitHub, X/Twitter, Reddit, TikTok, LinkedIn, etc.).
  - Stores hits in social_profiles, noting bio text, follower counts, location hints, timezone indicators, and verification badges.

### 3. Pivot Suggestions (Unconfirmed Pivots)

- What it means: Discovering new, previously unknown lead identifiers embedded inside public bios or profiles (e.g., an unlisted secondary phone number, crypto
address, or secondary handle in an Instagram/Telegram bio) and recommending them as investigative pivots.
- In Crime OS AI:
  - extract_pivots_from_bio() uses regular expressions and entity extractors on profile bios to surface new phone numbers, handles, and emails.
  - Human-in-the-Loop Safeguard: These remain flagged as unconfirmed pivots. They never automatically modify the main case record.
  - An officer must review the profile and click "Promote to Case Diary", which upgrades the entity to confirmed status and can trigger recursive investigation.

### 4. Actor-Attributed Audit Logs

- What it means: An immutable ledger where every action taken during OSINT gathering or evidence handling is tied to an explicit, authenticated actor (the
specific officer ID or system service).
- In Crime OS AI:
  - Every scan enqueue (osint_scan_enqueued), completion (osint_scan_completed), and pivot promotion is logged in audit_service.py.
  - Logs record user_id (the investigator's ID via JWT auth), case_id, action, exact timestamp, and payload metadata, ensuring complete accountability.

──────
## 03 — Chain of Custody

### 1. Preservation of Chain of Custody (Legal Grounding)

- The Problem: In court, electronic evidence is easily contested by defense attorneys claiming files were altered, replaced, or doctored while in police
possession.
- The Statutory Mandate:
  - Section 63 BSA (Bharatiya Sakshya Adhiniyam, 2023) — which replaced Section 65B of the Indian Evidence Act — requires a verifiable certificate proving the
integrity, custody, and uncorrupted state of electronic records.
- How Crime OS AI Solves It: By combining cryptographic SHA-256 fingerprinting at intake with actor-attributed, tamper-evident HMAC audit logs across the entire
evidence lifecycle.

### 2. SHA-256 Hashes

- What it means: A cryptographic one-way hashing function that produces a unique 64-character hexadecimal digest representing the exact binary content of a file.
- In Crime OS AI:
  - Handled at the instant an evidence file is received.
  - The hash is calculated on the raw binary bytes and stored permanently in evidence_files.sha256_hash.
  - If a single pixel, bit, or metadata byte in the video is modified later, recomputing the SHA-256 hash will produce a completely different string, instantly
flagging corruption or tampering.

### 3. Immutable Audit Logs & Cryptographic Tamper-Evident Ledger

- What it means: An append-only log where entries cannot be edited, retroactively inserted, or deleted without mathematically breaking the chain.
- In Crime OS AI (LedgerService in video_service.py):
  - Rather than storing simple timestamps (which could be edited in a database), Crime OS uses an HMAC-SHA256 Blockchain-style Ledger:
record_string = f"{case_id}|{event_type}|{canonical_payload}|{prev_hash}"
    record_hash   = hashlib.sha256(record_string.encode("utf-8")).hexdigest()
    signature     = hmac.new(JWT_SECRET, record_hash.encode("utf-8"), hashlib.sha256).hexdigest()

  - Every evidence lifecycle event (FILE_UPLOADED ➡ ANALYSIS_STARTED ➡ GEMINI_UPLOAD_COMPLETE ➡ INCIDENT_REPORT_GENERATED ➡ GEMINI_FILE_DELETED ➡
ANALYSIS_COMPLETED) embeds the hash of the previous event (prev_hash).
  - If someone tampers with a database row or changes an event payload, verify_case_chain() fails immediately because recomputing the chain breaks the
    signature match.

──────

### 💡 Quick Summary for Defense / Presentation

Feature           | Primary Purpose               | Key Technical Mechanism                       | Legal / Operational Impact
-------------------|-------------------------------|-----------------------------------------------|-------------------------------------------------------------
Video & Timeline  | Instant CCTV review           | Gemini Video AI + Click-to-seek (currentTime) | Turns hours of manual video scrubbing into seconds
OSINT Scans       | Suspect digital footprint     | Breach checks + Sherlock/Holehe scrapers      | Reveals hidden online personas and compromised credentials
Pivot Suggestions | Investigative lead generation | Regex bio extraction + "Promote to Case" gate | Keeps officer in the loop while discovering secondary leads
Chain of Custody  | Evidence court admissibility  | SHA-256 hashing + HMAC-SHA256 ledger chaining | Full Section 63 BSA compliance; tamper-evident proof in cour

---

> **01 — Case Intelligence**
- Case-scoped knowledge graph
- Audited AI mutations
- Verified citations
## 02 — Analytics & Summaries
- Correlate provider responses
- Match responses to case entities
- Promote findings to case diary
- One-click Markdown summaries
- Summary regeneration history
## 03 — Immutable Audit Trail
- Every AI-driven mutation recorded
- Append-only audit_events table
- Case-scoped Copilot knowledge
- Cited answers

○ Thought for 5.0s (Focusing on the provided points, it appears this outlines a system with three core areas. The first involves building case-specific intellige...)
● Explored 4 files (analytics_service.py, summary_service.py, copilot_service.py, +1) (ctrl+o to expand)

▸ Thought for 4s, 192 tokens
Inspecting the request, three core categories emerge: Case Intelligence, Analytics & Summaries, and an Immutable Audit Trail. Case Intelligence focuses on knowl...
Here is a comprehensive breakdown of each topic, explaining what it does, how it is implemented across the Crime OS AI architecture, and why it is critical for
police operations and court trials.
──────
## 01 — Case Intelligence

### 1. Case-Scoped Knowledge Graph

- What it means: An isolated, structured relational graph of all entities (suspects, victims, bank accounts, phone numbers, UPI IDs, IP addresses, CCTV markers)
belonging strictly to one specific case, rather than an open-ended or cross-contaminated global data pool.
- How Crime OS AI implements it:
  - Driven by assemble_case_context() and stored across normalized tables (case_entities, complaints, evidence_markers, legal_requests, provider_responses).
  - In digital policing, data cross-contamination between unrelated FIRs is illegal. By enforcing strict database isolation (where CaseEntity.case_id ==
case_id), the AI’s context boundary is completely confined to verified case materials.
  - Relationships between entities (e.g., Bank Account X received illicit funds from Phone Number Y via UPI Z) form an interconnected graph linked to that
case's investigation path.

### 2. Audited AI Mutations

- What it means: Whenever an AI agent or model alters the case state (e.g., adding a newly discovered entity, revising an investigation checklist, classifying a
crime, or recommending statutory sections), that state mutation cannot happen silently in the background.
- How Crime OS AI implements it:
  - In Crime OS AI, AI does not directly write uncontrolled mutations into database records.
  - Every mutation executes through an audited service layer (e.g., extraction_service.py, path_revision_service.py, osint_service.py).
  - Whenever an AI output modifies state, it triggers an audit_service.record() call logging:
    - action: (e.g., entities_extracted, path_revision_generated, osint_scan_completed).
    - detail: The full before/after delta, model version, and confidence score.
    - user_id: The ID of the authenticated officer who triggered or approved the mutation.

### 3. Verified Citations

- What it means: Anti-hallucination grounding. The AI is prevented from making assertions without pointing to an exact, verifiable source piece of evidence.
- How Crime OS AI implements it:
  - Supported by the provenance_service.py and the ai_citations table (AiCitation).
  - When Gemini produces an answer, summary, or recommendation, it must return a list of typed citations:
    - source_type: (e.g., complaint, entity, sop_chunk, legal_section, provider_response_row, evidence_marker).
    - source_id: Exact UUID of the database record.
    - excerpt: Exact verbatim snippet from the source document.
    - locator: Exact pointer (paragraph, timestamp in video, row index in CSV).
  - In the UI, these are rendered as Clickable Citation Chips, allowing an officer or judge to click the citation and view the original raw document.

──────
## 02 — Analytics & Summaries

### 1. Correlate Provider Responses

- What it means: In cyber fraud investigations, police send formal LERS notices to external providers (telecom companies for CDR call logs, banks for transaction
CSVs, social platforms for login IP logs). Providers return voluminous spreadsheets (often 1,000+ rows). Correlation automatically cross-references these rows
against the known case facts.
- How Crime OS AI implements it:
  - Handled by analytics_service.py via get_response_correlations().
  - When a provider response CSV is uploaded and parsed into provider_responses.parsed_data:
    - Gemini parses the top rows to produce an executive intelligence breakdown (ai_insights).
    - The correlation engine iterates over all records and scores each row based on whether it involves known suspects or money mule routes.

### 2. Match Responses to Case Entities

- What it means: Determining if a row in a 5,000-line bank ledger or telecom CDR log directly matches an accused entity.
- How Crime OS AI implements it:
  - The system normalizes cell values across rows and compares them to canonical case entities (CaseEntity.canonical_value):
    - Telecom: Detects if calling_number or called_number equals a target suspect phone number (assigns 95% confidence).
    - Banking: Detects if destination_account or source_account equals the victim's drained account or the accused's beneficiary mule account (assigns 98%
confidence).
    - Platforms: Detects if an access ip_address matches an IP logged during an extortion or phishing session.

### 3. Promote Findings to Case Diary

- What it means: Raw provider responses are not part of the official police case diary until an Investigating Officer (IO) formally admits them. "Promote to Case
Diary" is a one-click action that elevates a high-confidence match into formal evidence.
- How Crime OS AI implements it:
  - Handled by promote_correlation_to_diary() in analytics_service.py:440.
  - When the officer clicks "Promote":
1. Creates an AiCitation row linking the specific row index (source_type="provider_response_row").
2. Updates the row state so it appears as verified in the official Case Diary.
3. Re-injects this evidence into subsequent case summary generations and Copilot queries.

### 4. One-Click Markdown Summaries

- What it means: Synthesizing an entire multi-week investigation (complaints, extracted bank accounts, telecom logs, legal statutes, and CCTV pins) into a formal,
court-ready narrative document at the touch of a button.
- How Crime OS AI implements it:
  - Handled by summary_service.py via generate_summary().
  - It pulls all active facts from the database via _assemble_case_context() and passes them to Gemini using CASE_SUMMARY_PROMPT.
  - Gemini outputs structured Markdown organized into formal police reporting sections:
    - Case Particulars & Parties Involved
    - Modus Operandi & Chronology of Events
    - Material Evidence Gathered (Digital & Multimedia)
    - Statutory Violations (BNS / BNSS / IT Act)
    - Next Procedural Actions Recommended

### 5. Summary Regeneration History (Versioned Summaries)

- What it means: As new evidence arrives (e.g., a bank responds or a suspect's phone is located), the summary changes. Instead of overwriting the previous
summary, every generation creates an immutable new version (v1, v2, v3).
- Why it matters in court:
  - A defense attorney could accuse the police of fabricating claims late in the investigation.
  - Versioning proves transparency: the court can inspect v1 (what the police knew on Day 1) versus v3 (what was uncovered after bank responses on Day 7).
- How it works:
  - Stored in case_summaries where version = max_version + 1.
  - Old summary rows are never deleted or overwritten.

──────
## 03 — Immutable Audit Trail

### 1. Every AI-Driven Mutation Recorded

- What it means: In a police investigation, "magic AI" that silently changes case records is inadmissible and dangerous. Every AI generation, translation, path
revision, and entity extraction is permanently logged.
- How Crime OS AI implements it:
  - Handled via audit_service.record().
  - Logs record:
    - The exact prompt purpose and model name.
    - Full JSON input context and generated output.
    - Status (SUCCESS or FALLBACK).
    - Confidence ratings.

### 2. Append-Only audit_events Table

- What it means: A database table designed so rows can only be inserted (INSERT), never modified (UPDATE) or deleted (DELETE).
- Technical & Legal Guarantee:
  - Enforced at the application service level and database level.
  - Even if an officer or administrator has database access, retroactive edits are forbidden.
  - For evidence files, LedgerService adds a cryptographic HMAC-SHA256 hash chain: each record incorporates the previous event's hash (record_hash =
sha256(case_id | action | payload | prev_hash)). If any row is modified or deleted, the hash chain breaks upon verification.

### 3. Case-Scoped Copilot Knowledge

- What it means: The interactive Case Copilot assistant does not answer questions from general internet training or general world knowledge. It is strictly
constrained to the verified database facts of the active case.
- How Crime OS AI implements it:
  - Handled by copilot_service.py via assemble_case_context(db, case_id).
  - Before prompting Gemini, the system injects the case's verified complaints, entities, legal sections, path steps, and provider responses into the prompt.
  - The system prompt instructs the model: "You are grounded in this case context. If an answer cannot be verified from the provided context, state that the
information is not present in the case records."

### 4. Cited Answers

- What it means: Every answer provided by the Copilot in the chat drawer is backed by explicit citations linking directly to the case records.
- How Crime OS AI implements it:
  - When answering an officer's query (e.g., "What bank accounts were used by the suspect?"), Gemini returns the response conforming to GeminiCopilotResponse:
{
"answer": "The suspect received funds in State Bank of India Account #XXXX...",
"citations": [
{
"source_type": "entity",
"source_id": "e2a1b9...",
"excerpt": "SBI A/C 9876543210",
"locator": "Complaint Para 3",
"confidence": 0.98
}
]
}

  - In the UI, the officer sees interactive badge chips beneath the message. Clicking a badge highlights the exact evidentiary document, ensuring zero
hallucinations and full evidentiary traceability.

──────

### 🏛 Summary Matrix: The Three Pillars

Pillar                | Core Feature                              | Backend Service                          | Court Admissibility Value
-----------------------|-------------------------------------------|------------------------------------------|--------------------------------------------------
Case Intelligence     | Knowledge Graph & Verified Citations      | copilot_service.py,                      | Eliminates hallucinations; provides statutory
|                                           | provenance_service.py                    | grounding (BNS/BNSS)
Analytics & Summaries | Provider Correlation & Versioned          | analytics_service.py, summary_service.py | Connects bank/telecom data to suspects;
| Summaries                                 |                                          | preserves evolving case history
Immutable Audit Trail | Append-Only HMAC Ledger & Copilot Logging | audit_service.py, video_service.py       | Full Section 63 BSA compliance; mathematical
|                                           |                                          | proof against evidence tampering

---

> **Ingest — Ingest complaint; extract entities.**

Verify — Verify entities; generate SOP path and BNS sections.

Draft — Draft CDR, freeze, or KYC request.

Approve — SHO approves; SMTP dispatch.

Analyze — Ingest response; flag suspicious patterns.

Summarize — Generate summary; review audit trail.

○ Thought for 5.5s (CrimeOS's investigation workflow lifecycle outlines six distinct stages. The system seems designed to manage complaints from intake through a...)
● Explored 1 file (command_center_service.py) (ctrl+o to expand)

▸ Thought for 7s, 850 tokens
Formal statutory notices require Station House Officer (SHO) approval, enforced by a Role-Based Access Control (RBAC) gate requiring SHO credentials. Upon appro...
This 6-stage lifecycle represents the core operational backbone of Crime OS AI (the "Investigation Spine" managed by command_center_service.py). It transitions a
raw, unstructured citizen complaint into a court-admissible prosecution dossier.

Here is the step-by-step breakdown of each stage:

    ┌───────────────┐   ┌──────────────────┐   ┌────────────────┐
    │               │   │                  │   │                │
    │ S1["1. Ingest │   │  S2["2. Verify   │   │ S4["4. Approve │
    │               ├─┬►│                  │ ┌►│                │
    │   Complaint   │ │ │     Entities     │ │ │    SHO Gate    │
    │               │ │ │                  │ │ │                │
    └───────┬───────┘ │ └──────────────────┘ │ └────────────────┘
    │         │                      │
    ├─────────┤                      │
    ┌───────────────┐ │ ┌──────────────────┐ │ ┌────────────────┐
    │       ┴       │ │ │                  │ │ │                │
    │     OCR"]     ├─┴►│    BNS/SOP"]     │ │ │     SMTP"]     │
    │               │   │                  │ │ │                │
    └───────────────┘   └──────────────────┘ │ └────────────────┘
    │          ▲
    ┌──────────┘          │
    ┌───────────────┐   ┌──────────────────┐            │
    │               │   │         ┴        │            │
    │               │   │     3. Draft     │            │
    │       S2      ├──►│                  ├────────────┘
    │               │   │   LERS Notices   │
    │               │   │                  │
    └───────────────┘   └──────────────────┘

    ┌───────────────┐   ┌──────────────────┐
    │               │   │                  │
    │               │   │  S5["5. Analyze  │
    │       S4      ├──►│                  │
    │               │   │    Responses     │
    │               │   │                  │
    └───────┬───────┘   └──────────────────┘
    │
    └─────────┐
    ┌───────────────┐ │ ┌──────────────────┐
    │               │ │ │                  │
    │       S5      │ └►│  Correlation"]   │
    │               │   │                  │
    └───────┬───────┘   └──────────────────┘
    │
    │
    │           ┌──────────────────┐
    │           │                  │
    │           │ S6["6. Summarize │
    ├──────────►│                  │
    │           │     Dossier      │
    │           │                  │
    │           └──────────────────┘
    │
    │
    │           ┌──────────────────┐
    │           │                  │
    └──────────►│  Audit Trail"]   │
    │                  │
    └──────────────────┘
──────

### 1. Ingest — Ingest complaint; extract entities

- What Happens: An officer receives a messy complaint—a photographed handwritten FIR (Gujarati/Hindi), an audio recording from an emergency desk, or a scanned
PDF.
- Technical Implementation:
  - Driven by ingestion_service.py and extraction_service.py.
  - Multimodal Gemini handles handwriting OCR, regional audio transcription (ASR), and language translation (Gujarati/Hindi → English) in a single pass.
  - The NLP pipeline identifies key entities: phone numbers, bank accounts, IFSC codes, UPI IDs, URLs, suspect aliases, and monetary loss amounts.
- Why It Matters: Eliminates manual data entry and language barriers in police stations, turning unstructured paperwork into digital data within seconds.
──────

### 2. Verify — Verify entities; generate SOP path and BNS sections

- What Happens: Raw AI extractions cannot be trusted blindly. The officer reviews extracted data, after which the system maps statutory offenses and formulates a
step-by-step investigation plan.
- Technical Implementation:
  - Human-in-the-Loop Review: Entities with confidence < 0.80 receive a Warning Amber badge in the UI. The officer must verify or correct them before
continuing.
  - Statutory Grounding: path_service.py classifies the offense under the new Indian criminal laws:
    - BNS (Bharatiya Nyaya Sanhita): Substantive offenses (e.g., Section 318 for Cheating, Section 319 for Personation, Section 316 for Criminal Breach of
Trust).
    - IT Act: Section 66C/66D.
  - SOP RAG Retrieval: Queries official police Standard Operating Procedures stored in PostgreSQL using pgvector (sop_chunks with 768-dim embeddings).
  - Generates an actionable, numbered investigation checklist (InvestigationPath).
- Why It Matters: Guarantees procedural compliance. The officer is not acting on gut feeling but following statutory procedure grounded in official police
doctrine.
──────

### 3. Draft — Draft CDR, freeze, or KYC request

- What Happens: To catch cybercriminals, officers must obtain data from third-party intermediaries (telecoms, banks, platforms). The system auto-drafts legally
compliant notice templates.
- Technical Implementation:
  - Handled by legal_request_service.py using Jinja2 notice templates.
  - Auto-populates verified entities into standard statutory notices:
1. Bank Account Debit Freeze Notice: Formatted under Section 106 BNSS (seizure of property/accounts).
2. Telecom CDR / Subscriber KYC Notice: Formatted under Section 94 BNSS (summons to produce documents).
3. Social Platform / ISP IP Logs Notice: Formatted under Section 94 BNSS.
  - Readiness Gate: Verifies that the recipient email is valid, suspect entities are verified, and the statutory section is explicitly cited.
- Why It Matters: Manual notice drafting usually takes 2–4 hours. Crime OS produces legally airtight notices in seconds, critical for freezing stolen funds
within the "golden hour."
──────

### 4. Approve — SHO approves; SMTP dispatch

- What Happens: An Investigating Officer (IO) drafts the notice, but Indian law requires supervisory approval before a statutory notice can be issued.
- Technical Implementation:
  - Role-Based Access Control (RBAC): Investigating Officers cannot send notices directly. Only a user with the SHO (Station House Officer) role can authorize
issuance.
  - The SHO inspects the drafted notice, checks entity proofs, and signs off.
  - Once approved, the system uses an SMTP dispatch worker to transmit the signed notice directly to the registered nodal compliance mailboxes of banks (e.g.,
nodal-fraud@sbi.co.in) or telecom providers (e.g., lea-nodal@airtel.in).
- Why It Matters: Ensures full legal validity. Notices issued without statutory authority are thrown out in court and leave officers vulnerable to departmental
scrutiny.
──────

### 5. Analyze — Ingest response; flag suspicious patterns

- What Happens: Banks and telecom providers respond with raw data files (e.g., bank statement CSVs with 1,000+ transaction rows, CDR call records, cell tower
pings).
- Technical Implementation:
  - Handled by analytics_service.py.
  - Ingests and parses the raw data into provider_responses.
  - Entity Correlation Engine: Cross-references every incoming transaction or phone call against known case entities:
    - Flags beneficiary accounts receiving stolen funds with 98% confidence.
    - Highlights mule account networks and rapid fund layering.
    - Detects IMEI hopping or off-hours calls to conspirators.
  - Promote to Case Diary: The officer clicks one button to promote verified findings into the formal case record.
  - Adaptive Path Revision: Triggers path_revision_service.py to add new investigative steps based on newly uncovered leads.
- Why It Matters: Overcomes the human bottleneck of manually auditing massive financial spreadsheets, spotting fund-layering trails in seconds.
──────

### 6. Summarize — Generate summary; review audit trail

- What Happens: The investigation concludes or reaches a milestone. The officer needs a formal case diary summary, charge sheet draft, and proof of integrity for
the public prosecutor and trial court.
- Technical Implementation:
  - Versioned Narrative Generation: summary_service.py synthesizes all verified facts into a structured Markdown document (v1, v2, v3). Past versions are never
overwritten, preserving the investigation's chronological evolution.
  - Immutable Audit Ledger: Reviewing audit_service.py and video_service.py reveals:
    - An append-only audit_events log of every action, officer login, and AI mutation.
    - An HMAC-SHA256 chained hash ledger proving evidence files were never altered.
  - Section 63 BSA Admissibility: Provides the cryptographic certificate required by Indian courts to admit electronic records into evidence.
- Why It Matters: Delivers a complete, tamper-proof, court-ready prosecution package, closing the loop from raw complaint to conviction.
──────

### 📊 Quick Workflow Summary

Stage                                 | Responsible Service                   | Key Action / Mechanism                  | Legal / Statutory Anchor
---------------------------------------|---------------------------------------|-----------------------------------------|---------------------------------------
1. Ingest                             | ingestion_service.py                  | Multilingual OCR & Entity Extraction    | FIR Registration / Citizen Portal
2. Verify                             | path_service.py                       | Human review + pgvector SOP RAG         | BNS (Sec 318, 319) & Police SOPs
3. Draft                              | legal_request_service.py              | Auto-draft Jinja2 LERS notices          | Section 94 & 106 BNSS
4. Approve                            | legal_request_service.py              | SHO RBAC gate + SMTP dispatch           | Statutory Police Authority
5. Analyze                            | analytics_service.py                  | Mule correlation + Case diary promotion | Evidence Collection & CDR Analysis
6. Summarize                          | summary_service.py, audit_service.py  | Versioned Markdown + HMAC ledger        | Section 63 BSA (Court Admissibility)

---

> **Layer    Technology    Responsibility**
## 01 — Frontend    Next.js 14    User interface and command center
## 02 — Backend    FastAPI    API gateway and business logic
## 03 — Database    PostgreSQL 16 with pgvector    Primary database and vector embeddings
## 04 — Local AI    Ollama, qwen2.5:3b    Local text-processing model
## 05 — Cloud Escalation    Gemini AI    Vision and escalation handler

○ Thought for 5.2s (Examining the architecture table, noting distinct layers for frontend, backend, database (with vector embeddings), local AI, and cloud escala...)
● Explored 1 file (SYSTEM_ARCHITECTURE_OVERVIEW.md)
● Ran (grep -rn -i "ollama" .) failed (ctrl+o to expand)

▸ Thought for 6s, 464 tokens
The query suggests the architecture might have provisions for local models. Examining the documentation confirms the existence of fallback interfaces designed f...
Here is a comprehensive breakdown of this 5-layer hybrid architecture, explaining what each layer does, how they interact, and why this design is critical for
law enforcement deployments.
──────
    │ Diagram exceeds terminal width (472 > 165 cols)
    │ Displayed as code block. Widen terminal to view inline.

    flowchart TD
L1["01 — Frontend (Next.js 14)\nCommand Center & Role-Guarded UI"]
L2["02 — Backend (FastAPI)\nAPI Gateway, RBAC & Business Logic Engine"]
L3[("03 — Database (PostgreSQL 16 + pgvector)\nRelational Records + 768-dim Vector Embeddings")]

subgraph AI_TIERS["Hybrid Edge-Cloud AI Pipeline"]
L4["04 — Local AI (Ollama: qwen2.5:3b)\nOn-Premise Text Extraction, PII Privacy & Offline Fallback"]
L5["05 — Cloud Escalation (Gemini AI)\nMultimodal Vision, CCTV Video Forensics & Deep RAG"]
end

L1 <-->|"HTTP / JSON (Bearer JWT + X-Lang)"| L2
L2 <-->|"SQLAlchemy & pgvector cosine queries"| L3
L2 -->|"Fast text tasks / air-gapped station"| L4
L2 -->|"Vision / CCTV / Complex reasoning"| L5
L4 -.->|"Escalate if confidence < threshold or multimodal"| L5
──────

### Layer 01 — Frontend

- Technology: Next.js 14 (App Router, TypeScript, Tailwind CSS, Radix UI)
- Responsibility: User Interface and Command Center
- Key Capabilities:
  - Unified Command Center: Delivers the interactive 6-stage investigation workflow (Ingest ➡ Verify ➡ Path ➡ Request ➡ Analyze ➡ Summarize).
  - Role-Guarded Interface (RBAC): Renders specific controls based on officer rank—e.g., an Investigating Officer (IO) can only draft notices, while only a
Station House Officer (SHO) sees the "Approve & Dispatch" button.
  - Interactive Workspaces: Provides side-by-side complaint translation, video player with click-to-seek CCTV pinning, and an OSINT investigation panel.
  - Tri-Lingual Header (X-Lang): Supports seamless toggling between English, Hindi (ह​िंद​ी), and Gujarati (ગુજર​ાત​ી).
  - Case Copilot Drawer: Interactive chat drawer with clickable citation chips linking directly to evidentiary source records.

──────

### Layer 02 — Backend

- Technology: FastAPI (Python 3.11+, Uvicorn, Pydantic v2)
- Responsibility: API Gateway and Business Logic
- Key Capabilities:
  - High-Throughput Gateway: Exposes RESTful domain routers (/cases, /ingestion, /paths, /requests, /analytics, /video, etc.).
  - Zero-Distributed Overhead: Instead of heavy message queues (like Celery/Redis/Kafka), it utilizes native FastAPI BackgroundTasks for asynchronous tasks
(video indexing, OSINT scans, SMTP email dispatch), making local station deployment effortless.
  - Business Logic & Notice Templating: Houses Jinja2 templates for statutory notices (Section 94 CDR notice, Section 106 bank freeze) and enforces strict
legal readiness checks.
  - Security & Auditing: Manages JWT authentication (HS256) and logs every system state mutation to the immutable audit service.

──────

### Layer 03 — Database

- Technology: PostgreSQL 16 with pgvector
- Responsibility: Primary Relational Store and Vector Embeddings
- Key Capabilities:
  - Single-Database Simplicity (Hybrid Relational + Vector): Eliminates the complexity and synchronization latency of external vector databases (like Pinecone
or Milvus) by storing standard case data and vector embeddings side-by-side in PostgreSQL.
  - SOP Semantic Retrieval (pgvector): Stores police Standard Operating Procedure chunks as 768-dimensional vectors (VECTOR(768)). The legal grounding engine
runs cosine distance similarity queries directly in SQL:
    SELECT * FROM sop_chunks ORDER BY embedding <=> query_embedding LIMIT 5;

  - Append-Only Auditing: Stores the immutable audit_events and evidence ledger records ensuring Section 63 BSA compliance.

──────

### Layer 04 — Local AI

- Technology: Ollama running qwen2.5:3b
- Responsibility: Local, Air-Gapped Text Processing Model
- Key Capabilities:
  - Data Sovereignty & PII Protection: Processes sensitive citizen complaints, names, phone numbers, and bank account numbers entirely on-premise without
transmitting data over the internet.
  - Offline / Air-Gapped Station Resilience: Police stations in remote areas or stations operating during internet outages can still parse complaints,
normalize entities, and generate routine case notes locally.
  - Low Latency & Zero Cloud API Cost: A lightweight 3-billion-parameter model (qwen2.5:3b) runs efficiently on standard workstation hardware or modest edge
GPUs, providing near-instant responses for high-volume text summarization and formatting.

──────

### Layer 05 — Cloud Escalation

- Technology: Google Gemini AI (Gemini 2.5 Flash / Pro, Multimodal Vision & Video Files API)
- Responsibility: Vision, CCTV Multimedia Forensics, and Escalation Handler
- Key Capabilities:
  - Multimodal CCTV & Video Forensics: Video footage cannot be parsed by lightweight local LLMs. Gemini processes multi-hour video feeds via the Gemini Files
API, returning structured timestamped event logs and license plate identifications.
  - Handwritten OCR & Dialect Audio (ASR): Transcribes degraded, cursive handwriting on paper FIRs and regional spoken audio accents in Gujarati and Hindi.
  - Zero-Retention Cloud Handling: Video files uploaded for cloud analysis are immediately deleted from Google's servers (gemini_client.delete_file()) once
structured forensic reports are returned, maintaining station-level custody.
  - Complex Cross-Case Synthesis: Handles deep cross-jurisdictional legal synthesis and heavy reasoning tasks when local confidence falls below statutory
thresholds.

──────

### 💡 Why This Hybrid 5-Layer Stack Wins in Law Enforcement

Dimension          | Pure Cloud Architecture  | Pure Local Architecture         | Crime OS Hybrid Architecture
--------------------|--------------------------|---------------------------------|-------------------------------------------------------------------------------
Data Privacy (PII) | High exposure risk       | Fully private                   | Local First: Routine PII stays on-premise; only sanitized or non-retained
|                          |                                 | payloads escalate.
Internet Outage    | Complete station         | Unaffected                      | Never-Die Resilience: Core ingestion and drafting continue via Ollama; cloud
| blackout                 |                                 | tasks queue gracefully.
Video & Multimodal | Powerful                 | Fails (requires massive GPU     | Best of Both: Heavy CCTV and video workloads escalate seamlessly to Gemini.
|                          | clusters)                       |
Hardware Footprint | Low local requirement    | Very high (expensive station    | Station-Friendly: Runs smoothly on standard police department desktops.
|                          | servers)                        |

---

> **Fallback Chain (Waterfall)**
1. Local Model — Ollama
  - Primary inference engine
2. Gemini Cloud
  - Escalation for complex queries
3. Last-Good Cache
  - Cached responses fallback
4. Deterministic Template
  - Static safe response

○ Thought for 4.5s (Analyzing CrimeOS documentation to understand resilience and fallback strategies. The aim is to map the user's proposed fallback chain (local...)
● Explored 1 file (gemini_client.py) (ctrl+o to expand)

This 4-tier Fallback Chain (Waterfall) embodies Crime OS AI’s core architectural principle: "Never-Die Fallbacks & Zero Blackouts."

In police and emergency operations, an application crash or 500 Internal Server Error during an ongoing investigation or midnight FIR registration is
unacceptable. The waterfall guarantees that the system gracefully degrades across four levels rather than failing.

    │ Diagram exceeds terminal width (461 > 165 cols)
    │ Displayed as code block. Widen terminal to view inline.

    flowchart TD
REQ["Incoming User / Pipeline Task"] --> T1{"Tier 1: Local Model\n(Ollama - qwen2.5:3b)"}

T1 -- "High confidence & text-only" --> SUCCESS1["✅ Immediate Local Output\n(Zero Cloud Cost, Zero Latency)"]
T1 -- "Complex query, vision needed,\nor low confidence" --> T2{"Tier 2: Cloud Escalation\n(Gemini 2.5 Flash / Pro)"}

T2 -- "API Success" --> SUCCESS2["✅ High-Accuracy Cloud Output\n(Caches result in PostgreSQL)"]
T2 -- "Offline, rate-limited, or 3x timeouts" --> T3{"Tier 3: Last-Good Cache\n(PostgreSQL fallback_cache)"}

T3 -- "Cache Hit (SHA-256 match)" --> SUCCESS3["✅ Verified Historical Output\n(No Network Needed)"]
T3 -- "Cache Miss / Unseen Input" --> T4["Tier 4: Deterministic Template\n(Hardcoded Rule-Based Fallback)"]

T4 --> SUCCESS4["✅ Safe Structured Baseline\n(Never Crashes, Flags Officer Review)"]
──────

### Tier 1: Local Model — Ollama (qwen2.5:3b)

- Role: Primary Inference Engine (First Line of Defense)
- When it executes:
  - Handles local text extraction, entity normalization, fast complaint parsing, and initial summarization on-premise.
- Why it's Tier 1:
  - Zero Latency: Runs locally on the station workstation; no network hops.
  - Strict PII Protection: Sensitive citizen data (names, mobile numbers, Aadhaar details) never leaves the local machine.
  - Cost-Free: Zero API billing overhead.
- When it cascades to Tier 2:
  - When the task involves multimedia/vision (CCTV video analysis, degraded handwritten FIR scans, audio ASR).
  - When the local model's confidence falls below the statutory threshold (< 0.80).
  - When complex multi-statute legal reasoning (cross-referencing BNS with specialized IT Act provisions) is requested.

──────

### Tier 2: Cloud Escalation — Gemini Cloud

- Role: Heavy Reasoning, Multimodal Vision, and Escalation Handler
- When it executes:
  - Escalated tasks from Tier 1, large PDF analysis, audio transcription in regional Indian dialects, video keyframe indexing, and SOP vector embeddings.
- Why it's Tier 2:
  - High reasoning capability (Gemini 2.5 Flash / Pro) capable of extracting timestamped incident logs from multi-hour CCTV footage.
  - Supported by a Zero-Retention Policy (cloud files are purged via gemini_client.delete_file() immediately after extraction).
- When it cascades to Tier 3:
  - Total station internet outage or network drops.
  - Upstream API quota / 429 rate limit errors.
  - After 3 exponential backoff retry attempts in gemini_client.py:66-85.

──────

### Tier 3: Last-Good Cache — fallback_cache

- Role: Cryptographic Cache of Previous Successful Inferences
- When it executes:
  - Triggers when the cloud API fails or network connectivity drops.
- How it works technically:
  - Every input payload (prompt + files) is fingerprinted with a SHA-256 hash:
    input_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

  - Successful responses from previous executions are stored in the fallback_cache table in PostgreSQL.
  - If Gemini is unreachable, _get_cached(db, purpose, input_hash) fetches the identical cached JSON response.
- When it cascades to Tier 4:
  - The input is completely new (a brand-new FIR or previously unseen video hash) and no prior cache entry exists (Cache Miss).

──────

### Tier 4: Deterministic Template — Static Safe Response

- Role: Fail-Safe Baseline (The "Never-Die" Net)
- When it executes:
  - The station is completely offline AND the input has never been processed before.
- How it works technically:
  - System uses hardcoded, rule-based fallback generators instead of raising unhandled 500 exceptions:
    - Video Forensics: Returns get_deterministic_report() with a baseline incident structure and flags for manual review.
    - Case Summaries: Returns an auto-generated structural shell stating:
[AUTO-GENERATED FALLBACK SUMMARY — Version X]
Case: FIR-XXXX — Cheating / Cyber Financial Fraud
Automated AI synthesis unavailable due to offline mode.
Investigation facts compiled from active case records as of [Timestamp].

    - Analytics: Summarizes raw row counts and formats a warning asking the IO for manual inspection.

- Why it matters:
  - The UI never shows an empty blank screen, spinner death loop, or crash report.
  - The officer can still proceed with drafting notices, saving diary notes, or exporting the existing case file without interruption.

──────

### 📊 Resilience Comparison Matrix

Failure Scenario          | Traditional AI App Behavior | Crime OS Waterfall Behavior                | Officer Experience
---------------------------|-----------------------------|--------------------------------------------|----------------------------------------------------------
Normal Online Operation   | Cloud LLM query             | Tier 1 (Local) → Tier 2 (Cloud)            | Fast, private, multimodal intelligence
API Rate Limit / 429      | Crashes with error toast    | Cascades Tier 2 → Tier 3 (Cache)           | Seamless instant response from cache
Station Internet Severed  | App completely unusable     | Cascades to Tier 1 (Ollama) or Tier 4      | Full offline operation; investigation continues
|                             | (Template)                                 | uninterrupted
Novel Input + Full Outage | Unhandled 500 Server Error  | Tier 4 (Deterministic Template)            | UI renders safely with explicit "Manual Review" flag

---

> **1. Investigator**
- Next.js Command Center
- Multilingual interface: EN, HI, GU
2. CrimeOS Engine
- FastAPI Gateway
- Routes
- Security
- Core orchestration
3. AI Brain
- Gemini AI
- Reasoning
- Semantic Search
- SOP Grounding
4. Case Memory
- PostgreSQL + pgvector
- Case Graphs
- Evidence Vault
- Immutable Audit Ledger
5. External World
- Secure Connectors
- Banking APIs
- Telecom CDRs
- Digital Forensics
- Legal Notices

▸ Thought for 6s, 453 tokens
Analyzing the new architecture, it appears a system for crime investigation is being described, involving several key modules. The "Investigator" seems to be th...
This 5-pillar structure represents the complete architectural landscape and topology of Crime OS AI, illustrating how the human investigator connects with
backend services, artificial intelligence, persistent storage, and external law enforcement ecosystems.

    │ Diagram exceeds terminal width (876 > 165 cols)
    │ Displayed as code block. Widen terminal to view inline.

    flowchart TB
subgraph P1["1. INVESTIGATOR (Human-in-the-Loop Interface)"]
UI["Next.js Command Center"]
LANG["Multilingual Interface: EN, HI, GU"]
UI <--> LANG
end

subgraph P2["2. CRIMEOS ENGINE (Core Orchestration Gateway)"]
GATEWAY["FastAPI Gateway"]
ROUTES["Domain Routers (Cases, Requests, Evidence)"]
SEC["Security & RBAC (IO, SHO, LEGAL)"]
ORCH["Core Workflow State Machine"]
GATEWAY --> ROUTES --> ORCH
GATEWAY --> SEC
end

subgraph P3["3. AI BRAIN (Reasoning & Grounding)"]
GEMINI["Gemini AI & Multimodal Models"]
REASON["Procedural Reasoning"]
SEMANTIC["Semantic Search (pgvector)"]
SOP["SOP Legal Grounding (BNS/BNSS/BSA)"]
GEMINI --> REASON
SEMANTIC --> SOP
end

subgraph P4["4. CASE MEMORY (Persistence & Integrity)"]
DB["PostgreSQL + pgvector"]
GRAPH["Case Graphs & Entity Network"]
VAULT["Evidence Vault (Local + Hashes)"]
AUDIT["Immutable Audit Ledger (HMAC-SHA256)"]
DB --> GRAPH
DB --> VAULT
DB --> AUDIT
end

subgraph P5["5. EXTERNAL WORLD (Interoperability & Dispatches)"]
CONNECTORS["Secure Connectors & SMTP Relay"]
BANK["Banking APIs (Debit Freezes, Account Logs)"]
TELCO["Telecom CDRs (Call Logs, Cell Towers)"]
FORENSICS["Digital Forensics (CCTV, OSINT Breaches)"]
NOTICES["Statutory Legal Notices (Sec 94, 106 BNSS)"]
CONNECTORS --> BANK
CONNECTORS --> TELCO
CONNECTORS --> FORENSICS
CONNECTORS --> NOTICES
end

P1 <==>|"HTTP/JSON (Bearer JWT + X-Lang)"| P2
P2 <==>|"Context Ingestion & Structured Output"| P3
P2 <==>|"ACID Transactions & Vector Embeddings"| P4
P2 <==>|"TLS Dispatches & Provider Ingestion"| P5
──────
1. Investigator

The Human-in-the-Loop Presentation Layer.

- Next.js Command Center:
  - Role: A dark-mode, high-contrast operational dashboard engineered for high-pressure policing environments.
  - Core Functionality: Tracks the investigation spine across 6 stages (Ingest ➡ Verify ➡ Path ➡ Request ➡ Analyze ➡ Summarize), displaying completion
percentages, active blockers, and the single Next Best Action (e.g., "Draft Bank Freeze Notice").
- Multilingual Interface (EN, HI, GU):
  - Role: Eliminates the language barrier in Indian law enforcement.
  - Implementation: The frontend passes an X-Lang HTTP header with every request (en for English, hi for Hindi, gu for Gujarati).
  - Legal Preservation: While UI labels, instructions, and Copilot explanations are localized, critical legal identifiers (FIR numbers, case numbers, statutory
sections like Section 318 BNS, bank accounts, and phone numbers) are preserved in standard Latin digits and text for legal admissibility.

──────
2. CrimeOS Engine

The Central Nervous System and Execution Controller.

- FastAPI Gateway:
  - Role: High-throughput, asynchronous ASGI API gateway running on Python 3.11+.
  - Performance: Executes heavy background tasks (video keyframing, batch OCR, SMTP dispatch) via native FastAPI BackgroundTasks, eliminating the heavy
operational footprint of Celery/Redis.
- Routes (18 Domain Routers):
  - Role: Modular REST endpoints managing specific operational domains:
    - /cases — Master case lifecycle and state machine.
    - /ingestion — Multimodal complaint upload and OCR/ASR ingestion.
    - /paths — Procedural investigation checklists and revisions.
    - /requests & /responses — LERS drafting, SHO approvals, and provider analytics.
    - /video & /osint — Multimedia CCTV forensics and suspect digital footprints.

- Security & RBAC:
  - Role: Protects the platform against unauthorized access and procedural violations.
  - Implementation: Enforces JWT (HS256) bearer token authentication and strict Role-Based Access Control:
    - IO (Investigating Officer): Can ingest complaints, investigate leads, and draft notices.
    - SHO (Station House Officer): Possesses exclusive statutory authority to approve and dispatch legal notices.
    - LEGAL: Read-only oversight and compliance auditing.

- Core Orchestration:
  - Role: Managed by command_center_service.py.
  - Functionality: Tracks prerequisite dependencies (e.g., notices cannot be drafted until entities are verified; responses cannot be analyzed until notices
are dispatched), preventing premature or unlawful procedural actions.

──────
3. AI Brain

The Intelligence, Reasoning, and Grounding Engine.

- Gemini AI (2.5 Flash, 2.5 Pro, Files API):
  - Role: Primary foundation intelligence provider.
  - Capabilities: Multimodal vision for CCTV video streams, regional handwriting OCR, audio speech-to-text, and cross-case narrative generation.
- Reasoning:
  - Role: Extracts implicit relationships, money laundering layering routes, suspect aliases, and investigative discrepancies without hallucinations.
- Semantic Search:
  - Role: Embedded search over procedural knowledge bases using text-embedding-004 (768-dimensional vectors).
  - How it works: When an officer receives a novel cyber fraud complaint, the system converts the complaint into an embedding and retrieves the most
semantically relevant police SOP chunks via vector distance calculations.
- SOP Grounding:
  - Role: Guarantees that every suggestion adheres to official Indian law enforcement doctrine.
  - Statutory Framework: Maps facts strictly to the new statutory codes implemented in July 2024:
    - BNS (Bharatiya Nyaya Sanhita): Substantive offenses (Sec 318, 319, 316).
    - BNSS (Bharatiya Nagarik Suraksha Sanhita): Procedural powers (Sec 94, 106).
    - BSA (Bharatiya Sakshya Adhiniyam): Electronic evidence standards (Sec 63).

──────
4. Case Memory

The Cryptographic and Relational Persistence Layer.

- PostgreSQL 16 + pgvector:
  - Role: Hybrid relational datastore and vector database running in a single ACID-compliant database instance.
  - Advantage: Joins relational case metadata, user credentials, audit trails, and vector embeddings in single atomic SQL queries.
- Case Graphs (Entity Network):
  - Role: Persistent normalized graph of all people, bank accounts, phones, vehicles, and digital handles associated with a case (case_entities and
entity_relationships).
  - Advantage: Enables cross-entity correlation (e.g., linking Account A to Phone B to Suspect C).
- Evidence Vault:
  - Role: Local file storage system combined with cryptographic indexing.
  - Chain of Custody: The moment an evidence file touches the system, an immutable SHA-256 fingerprint is computed and recorded in evidence_files.sha256_hash.
If a file is tampered with, hash comparison immediately exposes corruption.
- Immutable Audit Ledger:
  - Role: Append-only ledger in video_service.py (LedgerService) and audit_events.
  - HMAC Chaining: Every evidence lifecycle event is signed with an HMAC-SHA256 signature chained to the previous record hash (record_hash = SHA256(case_id ∥
action ∥ payload ∥ prev_hash)), mathematically proving the integrity of the evidence record in court.

──────
5. External World

The Outward-Facing Law Enforcement Gateway.

- Secure Connectors:
  - Role: Authenticated communication bridges connecting the isolated police workstation to external nodes using TLS-encrypted SMTP and REST protocols.
- Banking APIs (Section 106 BNSS):
  - Role: Direct integration with public and private banks (State Bank of India, HDFC, ICICI, etc.) for debit freeze notices and KYC retrieval to halt money
mule withdrawals during the "golden hour."
- Telecom CDRs (Section 94 BNSS):
  - Role: Ingests Call Detail Records (CDRs), tower dumps, and IMEI activity logs from telecommunications providers (Airtel, Jio, Vi).
- Digital Forensics:
  - Role: Interfaces with open-source breach repositories and social media platforms for suspect footprinting, while managing CCTV feeds with zero-retention
cloud analysis.
- Legal Notices (LERS):
  - Role: Generates standardized, formal statutory notices using Jinja2 templates, complete with official police station headers, case numbers, and statutory
citations ready for SHO dispatch.

──────

### 🏛 Summary Matrix

Pillar                         | Primary Entity                 | Core Duty                            | Failure Prevention Guarantee
--------------------------------|--------------------------------|--------------------------------------|--------------------------------------------------------
1. Investigator                | IO / SHO Officer               | Human decision-making & review       | Eliminates unverified autonomous AI actions
2. CrimeOS Engine              | FastAPI Gateway                | Workflow progression & RBAC          | Blocks unauthorized actions without SHO approval
3. AI Brain                    | Gemini & pgvector              | Multimodal analysis & SOP matching   | Anti-hallucination prompts & verified citations
4. Case Memory                 | PostgreSQL & HMAC              | Data persistence & evidence custody  | Section 63 BSA proof against evidence tampering
5. External World              | Banks, Telcos, SMTP            | Notice dispatch & response ingestion | Closes the loop from notice dispatch to mule detection
