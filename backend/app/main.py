import logging
import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.ai import ollama_client, whisper_client
from app.config import settings
from app.database import get_db
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
    heatmap,
)
from app.schemas.common import AiHealthOut, MessageOut

app = FastAPI(title="Crime OS AI API", version="0.1.0")

logger = logging.getLogger("crime_os.main")

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
app.include_router(heatmap.router)



@app.get("/health", response_model=MessageOut, tags=["system"])
async def health() -> MessageOut:
    return MessageOut(message="ok")


@app.get("/ai/health", response_model=AiHealthOut, tags=["system"])
def ai_health(db: Session = Depends(get_db)) -> AiHealthOut:
    """Report which AI engines are reachable and how calls are currently routed.

    Sync def (not async) because the Ollama probe is a blocking HTTP call — FastAPI runs
    this in a threadpool so it cannot stall the event loop.
    """
    from app.scripts.reembed_sop import current_provider_label, read_corpus_provider

    corpus_provider = read_corpus_provider(db)
    if corpus_provider and corpus_provider != current_provider_label():
        # A mismatch means retrieval is comparing vectors from two unrelated spaces, which
        # degrades silently. Surface it loudly rather than letting it look healthy.
        logger.error(
            "embedding_corpus_mismatch corpus=%s configured=%s — run `python -m app.scripts.reembed_sop`",
            corpus_provider,
            current_provider_label(),
        )

    return AiHealthOut(
        ollama=ollama_client.is_available(),
        whisper=whisper_client.is_available(),
        gemini_configured=bool(settings.GEMINI_API_KEY),
        embedding_provider=settings.EMBEDDING_PROVIDER,
        chat_model=ollama_client.chat_model_label(),
        asr_model=whisper_client.model_label(),
        embedding_corpus_provider=corpus_provider,
    )
