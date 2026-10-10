#!/usr/bin/env bash
set -e

echo "=== Starting Crime OS AI Backend on Render ==="

# Check database readiness with retry and diagnostic logging
python -m app.db_wait || true

# Attempt migrations
echo "=== Running database migrations ==="
alembic upgrade head || echo "[WARNING] Alembic migrations could not be completed at startup. Continuing..."

# Seed database if SEED_ON_START is true or unset on first run
if [ "${SEED_ON_START:-false}" = "true" ]; then
    echo "=== Seeding database ==="
    python -m app.seeds.run || echo "[WARNING] Seeding could not be completed. Continuing..."
fi

PORT="${PORT:-10000}"
echo "=== Starting Uvicorn on port ${PORT} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
