import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
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

app = FastAPI(title="Crime OS AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
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




@app.get("/health", response_model=MessageOut, tags=["system"])
async def health() -> MessageOut:
    return MessageOut(message="ok")
