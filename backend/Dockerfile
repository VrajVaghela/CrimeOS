# ==============================================================================
# Video Incident Analyzer — Backend Dockerfile
# ==============================================================================
# Multi-purpose image for both FastAPI app and Celery worker services.
# Uses Python 3.12 slim base for minimal footprint.
# ==============================================================================

FROM python:3.12-slim

# Install system dependencies required by asyncpg and ffprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure Python can always find our modules, fixing Celery worker import errors
ENV PYTHONPATH=/app

# Install Python dependencies first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Default command (overridden in docker-compose.yml per service)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
