# Crime OS AI — Intelligence-Led Police Investigation Platform

Crime OS AI is an agentic AI platform designed for intelligence-led police investigations. It assists law enforcement officers across the full case lifecycle: from multimodal, multilingual complaint ingestion to SOP-grounded investigation path suggestions, automated legal request drafting, response analytics, and auto-generated versioned case summaries.

Developed for the **ERH26 Hackathon (Problem Statement: ERH26_PS_10)**, the platform is optimized to showcase an end-to-end investigation workflow while strictly maintaining legal grounding and audit transparency.

---

## 📖 Table of Contents
1. [Key Objectives & Problem Statement Mapping](#-key-objectives--problem-statement-mapping)
2. [The Golden Path Demo Flow](#-the-golden-path-demo-flow)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [Directory Structure](#-directory-structure)
6. [Database Schema](#-database-schema)
7. [Installation & Setup](#-installation--setup)
8. [Running the Application](#-running-the-application)
9. [Verification & Seeding](#-verification--seeding)

---

## 🎯 Key Objectives & Problem Statement Mapping

| Problem Statement Objective (PS_10) | Crime OS AI Implementation |
| :--- | :--- |
| **Multimodal & Multilingual Ingestion** | Ingests PDF, images (handwritten FIRs), and audio. Automatically translates Hindi/Gujarati/English to English while preserving entities. |
| **Grounded Investigation Paths** | RAG (Retrieval-Augmented Generation) query over Standard Operating Procedures (SOPs) database using `pgvector` embeddings to output step-by-step guidance. |
| **Relevant Legal Sections** | Suggests precise legal sections from **BNS, BNSS, and BSA** with cited reasonings. |
| **Automated Workflows** | Auto-generates LERS-compliant legal request drafts (CDR requests, bank freeze letters) populated with extracted case entities. |
| **Email Dispatch & Tracking** | Dispatches requests via SMTP to telecom/bank demo inboxes and tracks status. |
| **Response Analytics** | Ingests and parses structured provider response formats (mock CSV data) and highlights critical insights (e.g., suspicious transaction pattern callouts). |
| **Case Summaries & Audit Trail** | Provides one-click, version-controlled case summaries and maintains an append-only transaction-level audit trail. |

---

## 🚀 The Golden Path Demo Flow

To demonstrate the capabilities of Crime OS AI, follow this flow:

```mermaid
flowchart TD
    A[Ingest Complaint: Gujarati PDF/Hindi Audio/Handwritten FIR] --> B[AI OCR, Transcription, Translation & Entity Extraction]
    B --> C[Verify/Edit Extracted Entities in UI]
    C --> D[Generate SOP-Grounded Investigation Path & BNS Sections]
    D --> E[Select Action: Auto-Draft Legal Request CDR/Freeze/KYC]
    E --> F[SHO Approves & Dispatches Email via SMTP to Demo Inbox]
    F --> G[Receive Response -> Trigger Mock Provider CSV/PDF Ingestion]
    G --> H[AI Analyzes Response Data & Calls Out Suspicious Patterns]
    H --> I[Generate Case Log & Versioned One-Click Case Summary]
    I --> J[Review Immutable Audit Trail Timeline]
```

---

## 🏗️ System Architecture

The application is structured into a separated Frontend and Backend layer, communicating via HTTP JSON.

```
[Next.js Frontend :3000] -- HTTP/JSON --> [FastAPI Backend :8000] --> [PostgreSQL + pgvector :5432]
                                                |
                                                +--> Google Gemini API (LLM, Vision, Audio, Embeddings)
                                                +--> SMTP Server (Gmail App Password -> Demo mailbox)
                                                +--> Mock Routers (/mock/provider, /mock/cctns)
```

### Core Architectural Rules
1. **Frontend Isolation**: The frontend interacts *only* with the FastAPI gateway (`lib/api.ts`). It never reaches the DB or Gemini directly.
2. **Gateway Pattern**: `gemini_client.py` is the single entry point for all model logic, managing timeouts, JSON mode parsing, and error-handling fallbacks.
3. **No Inline Prompts**: All prompts are defined as named constants in `backend/app/ai/prompts.py`.
4. **Immutable Audit Trail**: Every AI-driven mutation generates an event written to the append-only `audit_events` table inside the same transaction block.
5. **Robust Demo Fallbacks**: To handle API throttling, all AI services implement a deterministic fallback path.

---

## 💻 Technology Stack

* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React icons, Radix UI primitives.
* **Backend**: FastAPI (Python 3.11+), Uvicorn.
* **Database**: PostgreSQL 16 with the `pgvector` extension for storing relational data and SOP chunk embeddings in one datastore.
* **ORM & Migrations**: SQLAlchemy 2.0 (typed models) and Alembic.
* **AI Model Gateway**: Google Gemini API (`gemini-2.5-flash` for extraction & transcription, `gemini-2.5-pro` for grounding and paths).
* **ASR & OCR**: Gemini audio input and Gemini vision, with Whisper and Tesseract as stubs.
* **Email dispatch**: Standard SMTP with fallback tracking.

---

## 📁 Directory Structure

```
erakshak/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── ai/               # Gemini client and prompts
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── routers/          # Route layers (HTTP endpoints only)
│   │   ├── services/         # Application logic (Ingestion, RAG, Paths, Requests)
│   │   ├── seeds/            # Seeding scripts, initial SOPs, Legal sections
│   │   ├── templates/        # LERS request Jinja2 templates
│   │   ├── config.py         # Config loader (Pydantic-Settings)
│   │   ├── database.py       # Engine and session initialization
│   │   └── main.py           # Application entrypoint
│   ├── alembic/              # Database migration versions
│   ├── requirements.txt      # Python dependencies
│   └── uploads/              # Local storage for uploaded complaints
├── frontend/                 # Next.js Application
│   ├── app/                  # Pages, layouts, tabs (Overview, Ingestion, Paths, Requests, Summary, Audit)
│   ├── components/           # UI elements (shadcn/ui layout tokens)
│   ├── lib/
│   │   ├── api.ts            # Frontend client for API calls
│   │   └── types.ts          # Type definitions mirroring backend schemas
│   ├── package.json
│   └── tailwind.config.ts
├── context/                  # Guidelines, progress trackers, and rules
├── docker/                   # Docker deployment configurations
├── data/                     # Sample complaint datasets (audio, images, PDFs)
└── docker-compose.yml        # PostgreSQL service config
```

---

## 🗄️ Database Schema

The database consists of the following tables:
* `users`: Credentials, names, and roles (`IO`, `SHO`, `LEGAL`).
* `cases`: Tracks case identifiers, status, and metadata.
* `complaints`: Stores original file path, raw content, translation, and source language.
* `extracted_entities`: Person name, bank accounts, dates, phone numbers, and confidence scores.
* `legal_sections`: Seeded BNS, BNSS, and BSA criminal code sections.
* `case_sections`: Case-to-legal sections association, with confidence and reasoning.
* `sop_documents`: Catalog of standard operating procedures.
* `sop_chunks`: Text segments mapped with vector embeddings (`VECTOR(768)`).
* `investigation_paths` & `path_steps`: Stepper actions, status, actions, and RAG citations.
* `legal_requests`: Telecommunications, bank-freeze, or platform requests.
* `provider_responses`: Parsed JSON response bodies and analytical insights.
* `case_summaries`: Version-controlled summaries generated from case activities.
* `audit_events`: Append-only, chronological transaction history.

---

## 🛠️ Installation & Setup

### Prerequisites
* Docker & Docker Compose
* Node.js 18+ (npm or yarn)
* Python 3.11+
* Gemini API Key (obtained from Google AI Studio)
* SMTP credentials (such as a Gmail App Password) for request dispatch

### 1. Database Setup
Start the PostgreSQL + pgvector container:
```bash
docker-compose up -d
```

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On Unix:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your `.env` file:
   Copy `.env.example` to `.env` and fill in the required variables (API keys, SMTP passwords, and database credentials).

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```

---

## 🏃 Running the Application

### Start the Backend
1. Go to the `backend` folder and run the migration + seed scripts:
   ```bash
   # Make sure your virtual environment is active
   alembic upgrade head
   python -m app.seeds.run
   ```
2. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will run at `http://localhost:8000`. You can view the automatically generated Swagger API documentation at `http://localhost:8000/docs`.

### Start the Frontend
1. Go to the `frontend` folder and start the Next.js dev server:
   ```bash
   npm run dev
   ```
   The frontend UI will be available at `http://localhost:3000`.

---

## 🧪 Verification & Seeding

The seed script (`app.seeds.run`) populates the database with:
1. **Mock Users**: Pre-configured credentials for roles like `IO` (Investigating Officer), `SHO` (Station House Officer), and `LEGAL` (Legal Advisor).
2. **SOP Documents**: Segmented SOP chunks embedded into the vector database for RAG lookups (covering topics like Cyber Financial Fraud, Mobile Theft, and Harassment).
3. **Legal Codes**: Curated sections of BNS, BNSS, and BSA.
4. **Pre-baked Cases**: Sample cases to allow instant demonstration without starting from scratch.
