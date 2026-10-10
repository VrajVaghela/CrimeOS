import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import sanitize_url, settings
from app.exceptions import register_exception_handlers
from app.routers import (
    auth,
    audit,
    cases,
    ingestion,
    mock_cctns,
    mock_provider,
    paths,
    requests,
    responses,
    summaries,
    evidence,
    command_center,
    entities,
    copilot,
    timeline,
    osint,
    video,
    translate,
)
from app.schemas.common import MessageOut

logger = logging.getLogger("crimeos.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import check_db_connection

    logger.info("Starting Crime OS AI API...")
    logger.info("Active database endpoint: %s", sanitize_url(settings.DATABASE_URL))
    healthy, detail = check_db_connection()
    if healthy:
        logger.info("Database connectivity verified.")
    else:
        logger.warning(
            "Database connectivity check failed on startup (%s). "
            "Server will continue running; please verify DATABASE_URL in environment.",
            detail,
        )
    yield
    logger.info("Shutting down Crime OS AI API...")


app = FastAPI(title="Crime OS AI API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(ingestion.router)
app.include_router(paths.router)
app.include_router(requests.router)
app.include_router(responses.router)
app.include_router(summaries.router)
app.include_router(audit.router)
app.include_router(mock_provider.router)
app.include_router(mock_cctns.router)
app.include_router(evidence.router)
app.include_router(command_center.router)
app.include_router(entities.router)
app.include_router(copilot.router)
app.include_router(timeline.router)
app.include_router(osint.router)
app.include_router(video.router)
app.include_router(translate.router)


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {
        "service": "Crime OS AI API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=MessageOut, tags=["system"])
async def health() -> MessageOut:
    return MessageOut(message="ok")


@app.get("/health/db", tags=["system"])
async def health_db() -> dict[str, str]:
    from app.database import check_db_connection

    healthy, detail = check_db_connection()
    return {
        "status": "healthy" if healthy else "unhealthy",
        "database": "connected" if healthy else "disconnected",
        "detail": detail,
    }

