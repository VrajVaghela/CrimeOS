import hashlib
import json
import logging
import time
from collections.abc import Sequence
from typing import Any, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import GenerationError
from app.models import FallbackCache

logger = logging.getLogger("crime_os.ai")
T = TypeVar("T", bound=BaseModel)


def _hash_input(payload: Any) -> str:
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise GenerationError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _get_cached(db: Session, purpose: str, input_hash: str) -> dict[str, Any] | None:
    cache = db.scalar(
        select(FallbackCache).where(FallbackCache.purpose == purpose, FallbackCache.input_hash == input_hash)
    )
    return cache.response_json if cache else None


def _store_cache(db: Session, purpose: str, input_hash: str, response_json: dict[str, Any]) -> None:
    cache = db.scalar(
        select(FallbackCache).where(FallbackCache.purpose == purpose, FallbackCache.input_hash == input_hash)
    )
    if cache:
        cache.response_json = response_json
    else:
        db.add(FallbackCache(purpose=purpose, input_hash=input_hash, response_json=response_json))
    db.flush()


def generate_json(
    db: Session,
    *,
    purpose: str,
    prompt: str,
    schema: type[T],
    files: Sequence[tuple[bytes, str]] | None = None,
    model: str | None = None,
) -> T:
    model_name = model or settings.GEMINI_FLASH_MODEL
    file_meta = [(len(content), mime_type) for content, mime_type in files or []]
    input_hash = _hash_input({"prompt": prompt, "files": file_meta, "model": model_name})
    contents: list[Any] = [prompt]
    contents.extend(types.Part.from_bytes(data=content, mime_type=mime_type) for content, mime_type in files or [])

    for attempt in range(3):
        started = time.perf_counter()
        try:
            response = _client().models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
            data = json.loads(response.text or "{}")
            parsed = schema.model_validate(data)
            _store_cache(db, purpose, input_hash, parsed.model_dump(mode="json"))
            logger.info("gemini_json purpose=%s model=%s latency=%.2f", purpose, model_name, time.perf_counter() - started)
            return parsed
        except Exception as exc:
            logger.warning("gemini_json_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))

    cached = _get_cached(db, purpose, input_hash)
    if cached:
        return schema.model_validate(cached)
    raise GenerationError(f"Gemini generation failed for {purpose} and no fallback cache is available")


def generate_text(db: Session, *, purpose: str, prompt: str, model: str | None = None) -> str:
    model_name = model or settings.GEMINI_FLASH_MODEL
    input_hash = _hash_input({"prompt": prompt, "model": model_name})
    for attempt in range(3):
        try:
            response = _client().models.generate_content(model=model_name, contents=prompt)
            text = response.text or ""
            _store_cache(db, purpose, input_hash, {"text": text})
            return text
        except Exception as exc:
            logger.warning("gemini_text_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
    cached = _get_cached(db, purpose, input_hash)
    if cached:
        return str(cached.get("text", ""))
    raise GenerationError(f"Gemini text generation failed for {purpose}")


def transcribe(db: Session, *, purpose: str, prompt: str, content: bytes, mime_type: str) -> str:
    model_name = settings.GEMINI_FLASH_MODEL
    input_hash = _hash_input({"prompt": prompt, "file": (len(content), mime_type), "model": model_name})
    contents: list[Any] = [prompt, types.Part.from_bytes(data=content, mime_type=mime_type)]
    for attempt in range(3):
        try:
            response = _client().models.generate_content(model=model_name, contents=contents)
            text = response.text or ""
            _store_cache(db, purpose, input_hash, {"text": text})
            return text
        except Exception as exc:
            logger.warning("gemini_transcribe_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
    cached = _get_cached(db, purpose, input_hash)
    if cached:
        return str(cached.get("text", ""))
    raise GenerationError(f"Gemini transcription failed for {purpose}")


def embed(texts: Sequence[str]) -> list[list[float]]:
    if not settings.GEMINI_API_KEY:
        raise GenerationError("GEMINI_API_KEY is not configured")
    response = _client().models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=list(texts),
        config={"output_dimensionality": 768},
    )
    return [list(item.values) for item in response.embeddings or []]
