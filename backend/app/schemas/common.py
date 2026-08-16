from pydantic import BaseModel


class MessageOut(BaseModel):
    message: str


class RouteStubOut(BaseModel):
    module: str
    status: str
    message: str


class AiHealthOut(BaseModel):
    """Which AI engines are reachable right now, and how text/embeddings are routed."""

    ollama: bool
    whisper: bool
    gemini_configured: bool
    embedding_provider: str
    chat_model: str
    asr_model: str
    embedding_corpus_provider: str | None = None
