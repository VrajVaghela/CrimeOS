# Running E-Rakshak Video Analyzer

This guide explains how to set up, run, and test the Video Incident Analyzer platform.

## Prerequisites
- Docker and Docker Compose
- A Google Gemini API Key (`GEMINI_API_KEY`)
- At least 4GB of RAM allocated to Docker

## 1. Environment Setup
Create a `.env` file in the root directory by copying the template:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
LEDGER_SIGNING_KEY=generate_a_secure_random_string_for_this
```
*Note: `LEDGER_SIGNING_KEY` can be any strong random string (e.g., output of `openssl rand -hex 32`).*

## 2. Running the Application
The entire stack is orchestrated via Docker Compose.

```bash
# Build and start all services in detached mode
docker-compose up --build -d
```

This starts:
- **postgres**: PostgreSQL database (Port 5432)
- **redis**: Redis message broker (Port 6379)
- **fastapi-app**: Backend API (Port 8000)
- **celery-worker**: Background task processor
- **frontend**: React Dashboard (Port 5173)

## 3. Accessing the Application
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

## 4. Viewing Logs
To monitor the system, particularly the background video analysis:
```bash
# View logs for all services
docker-compose logs -f

# View logs for specific services
docker-compose logs -f fastapi-app
docker-compose logs -f celery-worker
```

## 5. Running the Integration Test
A smoke test is provided to verify the end-to-end pipeline (upload -> processing -> report retrieval -> chain-of-custody verification).

```bash
# With the docker stack running, execute:
docker-compose exec fastapi-app python tests/smoke_test.py
```

## 6. Shutting Down
To stop the application and remove containers:
```bash
docker-compose down
```
*Note: Data in PostgreSQL and Redis is persisted in Docker volumes (`postgres_data`, `redis_data`). Add `-v` to wipe data.*
