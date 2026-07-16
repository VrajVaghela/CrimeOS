# System Architecture: E-Rakshak Video Analyzer

## Overview
E-Rakshak is a secure, AI-powered video incident analysis platform. It leverages Google Gemini 2.5 Flash for multimodal video comprehension, paired with a robust asynchronous backend and a cryptographically secure ledger for evidentiary integrity.

## Architecture Diagram
```mermaid
graph TD
    subgraph Frontend
        UI[React + Vite + Tailwind]
    end

    subgraph Backend Infrastructure
        API[FastAPI Service]
        CW[Celery Worker Service]
        BEAT[Celery Beat Timer]
    end

    subgraph Data Layer
        PG[(PostgreSQL)]
        RD[(Redis)]
        FS[Local File System /tmp]
    end

    subgraph External
        GEMINI[Google Gemini API]
    end

    UI -->|HTTP POST (Video)| API
    UI -->|HTTP GET (Status/Report)| API

    API -->|Metadata & Ledger| PG
    API -->|Save Upload| FS
    API -->|Enqueue Task| RD

    RD -->|Dispatch Task| CW
    CW -->|Read Video| FS
    CW -->|Stream/Upload| GEMINI
    CW -->|Prompt & Extract| GEMINI
    CW -->|Save Timeline & Ledger| PG
    CW -->|Clean up| FS
    
    BEAT -->|Hourly Cleanup Signal| RD
```

## Core Components

### 1. Frontend Dashboard (React/TypeScript)
- **Role**: User interface for uploading videos and reviewing incident reports.
- **Key Features**: Split-screen design, interactive video timeline (clicking an event seeks the video), real-time XHR upload progress, and Celery task polling.

### 2. API Gateway (FastAPI)
- **Role**: Ingress for client requests.
- **Security**: Rate-limited (SlowAPI), implements streaming upload validation (checks file magic bytes and size constraints before fully buffering to disk), and global exception handling to prevent leaking internals.

### 3. Task Queue (Celery + Redis)
- **Role**: Asynchronous processing of heavy AI tasks.
- **Mechanics**: Video analysis is CPU/IO bound and takes time. Celery offloads this from the API thread. Redis acts as the message broker and result backend. Celery Beat periodically cleans up orphaned temporary files.

### 4. Database & Ledger (PostgreSQL + SQLAlchemy)
- **Role**: Persistent storage of case metadata, timelines, and the evidentiary ledger.
- **Tamper-Evident Ledger**: Uses SHA-256 hash-chaining and HMAC signatures to guarantee that evidence records (upload, analysis start, results, failures) have not been altered. PostgreSQL triggers enforce an append-only rule on the ledger table.

### 5. AI Engine (Google Gemini SDK)
- **Role**: Multimodal extraction of chronological events, detected entities, and risk assessment from video files.
- **Mechanics**: Handles large videos via the File API, uses structured prompting to enforce JSON schema compliance, and implements context caching for videos over 10 minutes.
