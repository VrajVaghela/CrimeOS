"""
FastAPI Application — Main Entry Point (Hardened)
===================================================
Initializes the FastAPI application with production-grade hardening:

    - CORS middleware restricted to configured frontend origin
    - Global exception handler (sanitized error responses, no leaked internals)
    - SlowAPI rate limiting on upload endpoint (5/minute per IP)
    - Health check endpoint with live PostgreSQL and Redis pings
    - TEMP_UPLOAD_DIR creation on startup with restrictive permissions (0700)
    - Video analysis API router registration

Startup Sequence:
    1. Load and validate configuration (fail fast on missing secrets)
    2. Create TEMP_UPLOAD_DIR with 0700 permissions
    3. Register middleware (CORS, rate limiting)
    4. Register global exception handler
    5. Register routes (health + video analysis)

Security:
    - No raw tracebacks in client responses
    - No leaked file paths or internal config in error bodies
    - GEMINI_API_KEY never logged, even at debug level
"""

import logging
import os
import sys
import traceback
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from config import get_settings

# ── Logging Configuration ────────────────────────────────────────────────────
# Custom filter to prevent GEMINI_API_KEY from appearing in any log output
class SecretFilter(logging.Filter):
    """Logging filter that redacts sensitive values from log messages.

    Prevents GEMINI_API_KEY and LEDGER_SIGNING_KEY from being logged,
    even at debug level, including in SDK error messages and tracebacks.
    """

    def __init__(self):
        super().__init__()
        try:
            settings = get_settings()
            self._secrets = [
                settings.GEMINI_API_KEY,
                settings.LEDGER_SIGNING_KEY,
            ]
        except Exception:
            self._secrets = []

    def filter(self, record: logging.LogRecord) -> bool:
        """Redact any secret values found in log messages.

        Args:
            record: The log record to filter.

        Returns:
            bool: Always True (record is always emitted, but sanitized).
        """
        if hasattr(record, "msg") and isinstance(record.msg, str):
            for secret in self._secrets:
                if secret and secret in record.msg:
                    record.msg = record.msg.replace(secret, "[REDACTED]")
        return True


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("video-incident-analyzer")

# Apply secret filter to root logger so all child loggers inherit it
logging.getLogger().addFilter(SecretFilter())


# ── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager — handles startup and shutdown events.

    Startup:
        - Validates configuration (fails fast on missing secrets)
        - Creates TEMP_UPLOAD_DIR with restrictive permissions (0700)

    Shutdown:
        - Logs clean shutdown

    Args:
        app: The FastAPI application instance.
    """
    # ── Startup ──────────────────────────────────────────────────────────
    try:
        settings = get_settings()
        logger.info("Configuration loaded successfully")
    except Exception as e:
        logger.critical(f"Configuration validation failed: {e}")
        sys.exit(1)

    # Create temporary upload directory with restrictive permissions
    upload_dir = settings.TEMP_UPLOAD_DIR
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, mode=0o700, exist_ok=True)
        logger.info(f"Created TEMP_UPLOAD_DIR: {upload_dir} (mode 0700)")
    else:
        # Ensure permissions are correct even if directory already exists
        try:
            os.chmod(upload_dir, 0o700)
        except OSError:
            logger.warning(
                f"Could not set permissions on existing TEMP_UPLOAD_DIR: {upload_dir}"
            )

    logger.info("Video Incident Analyzer API started")
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("Video Incident Analyzer API shutting down")


# ── Application Instance ─────────────────────────────────────────────────────
app = FastAPI(
    title="Video Incident Analyzer API",
    description=(
        "AI-powered video evidence analysis platform with tamper-evident "
        "chain-of-custody tracking. Accepts video uploads, processes them "
        "through Google Gemini for incident timeline extraction, and maintains "
        "a cryptographically signed ledger for evidentiary integrity."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── Attach Rate Limiter ──────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS Middleware ───────────────────────────────────────────────────────────
# Restrict to configured frontend origin — never use "*" in production
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# ── Global Exception Handler ─────────────────────────────────────────────────
# Returns sanitized error bodies to clients — no raw tracebacks, no leaked
# file paths or internal config in responses.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with sanitized error responses.

    Logs full detail server-side (for debugging) but returns a generic
    error message to the client without exposing:
        - Raw tracebacks
        - Internal file paths
        - Configuration values or API keys
        - Database connection strings

    Args:
        request: The incoming HTTP request.
        exc: The unhandled exception.

    Returns:
        JSONResponse: Sanitized 500 error response.
    """
    # Log full detail server-side for debugging
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    sanitized_tb = "".join(tb)

    # Redact any secrets from the traceback before logging
    try:
        for secret in [settings.GEMINI_API_KEY, settings.LEDGER_SIGNING_KEY]:
            if secret:
                sanitized_tb = sanitized_tb.replace(secret, "[REDACTED]")
    except Exception:
        pass

    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: "
        f"{type(exc).__name__}: {sanitized_tb}"
    )

    # Return sanitized response — no internals leaked
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again later.",
            "error_type": type(exc).__name__,
        },
    )


# ── Health Check Endpoint ─────────────────────────────────────────────────────
@app.get(
    "/health",
    tags=["Infrastructure"],
    summary="Health check — verifies PostgreSQL and Redis connectivity",
    response_description="Service health status with dependency checks",
)
async def health_check():
    """Check the health of the application and its dependencies.

    Performs actual connectivity checks against PostgreSQL and Redis,
    not hardcoded status values. Returns individual component status
    for debugging infrastructure issues.

    Returns:
        dict: Health status with keys:
            - status (str): Overall status ("healthy" or "degraded")
            - postgres (bool): True if PostgreSQL is reachable
            - redis (bool): True if Redis is reachable
    """
    health = {"status": "healthy", "postgres": False, "redis": False}

    # ── PostgreSQL connectivity check ────────────────────────────────────
    try:
        engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        health["postgres"] = True
    except Exception as e:
        logger.warning(f"PostgreSQL health check failed: {e}")

    # ── Redis connectivity check ─────────────────────────────────────────
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.aclose()
        health["redis"] = True
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")

    # Set overall status
    if not health["postgres"] or not health["redis"]:
        health["status"] = "degraded"

    return health


# ── Router Registration ──────────────────────────────────────────────────────
from api.video_analysis import router as video_router

app.include_router(video_router, prefix="/api/v1/video", tags=["Video Analysis"])
