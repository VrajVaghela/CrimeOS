# STAGE 0 — Repo Scaffold & Infrastructure

Paste each checkpoint into Antigravity in order. One commit per checkpoint. Stop and fix if a precondition fails before continuing.

---

### CKPT-0.1 — Repo & Docker Compose Scaffold
```
Initialize the video-incident-analyzer repo with this directory structure (create all folders with .gitkeep placeholders where empty):

video-incident-analyzer/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── migrations/versions/
│   ├── main.py
│   ├── config.py
│   ├── api/ (__init__.py, video_analysis.py)
│   ├── tasks/ (__init__.py, video_tasks.py)
│   ├── database/ (__init__.py, connection.py, models.py)
│   └── utils/ (__init__.py, crypto.py)
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/ (App.tsx, main.tsx, components/VideoTimelineViewer.tsx)

Write docker-compose.yml orchestrating: fastapi-app (build ./backend, exposes 8000, depends_on postgres and redis with condition service_healthy), celery-worker (same image, command runs celery worker), redis:7-alpine (healthcheck via redis-cli ping), postgres:16-alpine (persistent volume, pg_isready healthcheck), frontend (build ./frontend, exposes 5173). All secrets come from .env via env_file — none hardcoded. Write .env.example listing GEMINI_API_KEY, DATABASE_URL, REDIS_URL, LEDGER_SIGNING_KEY, MAX_UPLOAD_SIZE_MB, and TEMP_UPLOAD_DIR with one-line comments for each. Do not write application code yet — infrastructure only.

Acceptance criteria:
- `docker compose config` validates with no errors
- `docker compose up` brings postgres, redis, fastapi-app, and celery-worker to healthy/running status
- No secret values appear in docker-compose.yml itself
```

### CKPT-0.2 — Backend Skeleton, Config & Health Check
```
Create backend/config.py using pydantic-settings (BaseSettings) to load GEMINI_API_KEY, DATABASE_URL, REDIS_URL, LEDGER_SIGNING_KEY, MAX_UPLOAD_SIZE_MB (default 500), TEMP_UPLOAD_DIR (default /tmp/video-uploads), ALLOWED_VIDEO_EXTENSIONS (default [".mp4",".avi",".mov"]). No defaults for secrets (GEMINI_API_KEY, LEDGER_SIGNING_KEY) — fail fast at startup with a named error if either is missing.

Create backend/main.py as a FastAPI app with CORS restricted to the frontend origin (configurable, not "*"), a GET /health endpoint that actually pings postgres and redis (not hardcoded true), and router registration stubs (commented) for the video_analysis router to be built in Stage 3. Ensure TEMP_UPLOAD_DIR is created on startup if it doesn't exist, with restrictive permissions (0700).

Acceptance criteria:
- `uvicorn main:app` boots cleanly against the docker compose stack
- GET /health returns 200 with postgres and redis both reporting true when the stack is up
- Missing GEMINI_API_KEY or LEDGER_SIGNING_KEY causes startup failure naming the specific missing variable
- TEMP_UPLOAD_DIR exists with 0700 permissions after startup
```
