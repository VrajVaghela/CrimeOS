"""
The single AI gateway. Every AI call in the app goes through these helpers.

Despite the module name (kept because 14 services import it), this routes each call to
the cheapest engine that can serve it and escalates to Gemini when the local one cannot:

    embed()                      -> nomic-embed-text  (chosen by EMBEDDING_PROVIDER,
                                    never by failure — see the note in embed())
    generate_text()              -> qwen2.5:3b        -> Gemini -> cache
    generate_json()  text-only   -> qwen2.5:3b        -> Gemini -> cache
    generate_json()  files=      -> Gemini            (no local vision model)
    transcribe()     audio       -> faster-whisper    -> Gemini -> cache
    transcribe()     pdf/image   -> Gemini            (no local vision model)
    generate_json_from_file()    -> Gemini            (Files API has no local analogue)
    upload_file/wait_for_file/delete_file -> Gemini

Invariant: input_hash is computed exactly as before — from the Gemini model name, before
any local attempt — so fallback_cache stays one provider-independent namespace and
entries warmed by either engine remain readable by the other.
"""
import hashlib
import json
import logging
import time
from collections.abc import Sequence
from contextvars import ContextVar
from typing import Any, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import ollama_client, whisper_client
from app.ai.prompts import GENERIC_JSON_SYSTEM_PROMPT, LOCAL_JSON_SCHEMA_INSTRUCTION, LOCAL_TEXT_SYSTEM_PROMPT
from app.config import settings
from app.exceptions import GenerationError
from app.models import FallbackCache

logger = logging.getLogger("crime_os.ai")
T = TypeVar("T", bound=BaseModel)

# Engine that served the most recent call, for provenance. A ContextVar rather than a
# module global because FastAPI runs sync endpoints and BackgroundTasks in a threadpool,
# where a global would leak one request's route into another's provenance record.
_route: ContextVar[str] = ContextVar("ai_route", default="unknown")

# Prompt-hash -> monotonic expiry. Suppresses repeat local attempts after a recent failure.
_LOCAL_MEMO_SECONDS = 60.0
_local_memo: dict[str, float] = {}


def last_route() -> str:
    """The engine that served the most recent AI call in this execution context."""
    return _route.get()


def _set_route(route: str) -> None:
    _route.set(route)


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


def _memo_key(prompt: str) -> str:
    """Keyed on the prompt alone, deliberately not on input_hash.

    path_revision_service calls generate_json twice with the same prompt but different
    Gemini models, so those two calls hash differently while the local route ignores
    `model` entirely. Without this, one failing path revision would cost four local
    generations on the most demo-visible feature.
    """
    return _hash_input({"prompt": prompt})


def _memo_is_cold(prompt: str) -> bool:
    key = _memo_key(prompt)
    expiry = _local_memo.get(key)
    if expiry is None:
        return True
    if time.monotonic() >= expiry:
        _local_memo.pop(key, None)
        return True
    return False


def _memo_mark_failed(prompt: str) -> None:
    now = time.monotonic()
    # Opportunistic prune so a long-running process cannot grow this unbounded.
    for stale in [key for key, expiry in _local_memo.items() if expiry <= now]:
        _local_memo.pop(stale, None)
    _local_memo[_memo_key(prompt)] = now + _LOCAL_MEMO_SECONDS


def _skip_prefixes() -> tuple[str, ...]:
    raw = settings.LOCAL_LLM_SKIP_PURPOSE_PREFIXES
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def _is_local_eligible(purpose: str, prompt: str) -> bool:
    """Five gates, cheapest first — the availability probe runs only if all others pass."""
    if not settings.OLLAMA_ENABLED:
        return False
    for prefix in _skip_prefixes():
        if purpose.startswith(prefix):
            logger.info("ai_local_skipped purpose=%s reason=purpose_skipped", purpose)
            return False
    if len(prompt) > settings.OLLAMA_MAX_PROMPT_CHARS:
        logger.info(
            "ai_local_skipped purpose=%s reason=prompt_too_long chars=%d limit=%d",
            purpose,
            len(prompt),
            settings.OLLAMA_MAX_PROMPT_CHARS,
        )
        return False
    # Script-aware token estimate. A prompt that overflows num_ctx would be silently
    # front-truncated, dropping the instructions, so fail toward Gemini instead.
    estimated = ollama_client.estimate_tokens(prompt)
    budget = ollama_client.prompt_token_budget()
    if estimated > budget:
        logger.info(
            "ai_local_skipped purpose=%s reason=token_budget est_tokens=%d budget=%d chars=%d",
            purpose,
            estimated,
            budget,
            len(prompt),
        )
        return False
    if not _memo_is_cold(prompt):
        logger.info("ai_local_skipped purpose=%s reason=recent_failure", purpose)
        return False
    return ollama_client.is_available()


def _try_local_json(db: Session, *, purpose: str, prompt: str, schema: type[T], input_hash: str) -> T | None:
    """Attempt structured generation locally. Returns None to mean "escalate to Gemini".

    Never raises. Two attempts: a grammar-constrained decode, then plain JSON mode in case
    the schema could not be compiled into a grammar.
    """
    if not _is_local_eligible(purpose, prompt):
        return None

    schema_json = schema.model_json_schema()
    # The JSON-schema -> grammar conversion discards `description`, so field semantics
    # Gemini gets via response_schema must be restated in the prompt.
    enriched = f"{prompt}\n\n{LOCAL_JSON_SCHEMA_INSTRUCTION.format(schema_json=json.dumps(schema_json, indent=2))}"
    # The restated schema is itself substantial (nested models run to a few thousand chars),
    # so re-check the budget against what will actually be sent, not just the caller's prompt.
    if ollama_client.estimate_tokens(enriched) > ollama_client.prompt_token_budget():
        logger.info(
            "ai_local_skipped purpose=%s reason=token_budget_with_schema schema=%s",
            purpose,
            schema.__name__,
        )
        return None
    route = ollama_client.chat_model_label()

    for attempt in range(2):
        started = time.perf_counter()
        try:
            raw = ollama_client.chat_json(
                prompt=enriched,
                system=GENERIC_JSON_SYSTEM_PROMPT,
                # Attempt 2 drops the grammar: a schema llama.cpp cannot compile surfaces
                # as an HTTP 400, and plain JSON mode still honours the in-prompt schema.
                schema_json=schema_json if attempt == 0 else None,
            )
            parsed = schema.model_validate_json(raw)
            _store_cache(db, purpose, input_hash, parsed.model_dump(mode="json"))
            _set_route(route)
            logger.info(
                "ai_call purpose=%s route=%s latency=%.2f schema=%s",
                purpose,
                route,
                time.perf_counter() - started,
                schema.__name__,
            )
            return parsed
        except Exception as exc:
            logger.warning(
                "ai_local_failed purpose=%s route=%s attempt=%d error=%s",
                purpose,
                route,
                attempt + 1,
                str(exc)[:200],
            )
            # A timeout means the server is busy, not that a retry would help; spending
            # attempt 2 could cost another full read timeout.
            if "timed out" in str(exc).lower():
                break

    _memo_mark_failed(prompt)
    return None


def _try_local_text(db: Session, *, purpose: str, prompt: str, input_hash: str) -> str | None:
    """Attempt free-text generation locally. Returns None to mean "escalate". Never raises."""
    if not _is_local_eligible(purpose, prompt):
        return None

    route = ollama_client.chat_model_label()
    for attempt in range(2):
        started = time.perf_counter()
        try:
            text = ollama_client.chat_text(prompt=prompt, system=LOCAL_TEXT_SYSTEM_PROMPT)
            if not text.strip():
                raise GenerationError("empty local response")
            _store_cache(db, purpose, input_hash, {"text": text})
            _set_route(route)
            logger.info("ai_call purpose=%s route=%s latency=%.2f", purpose, route, time.perf_counter() - started)
            return text
        except Exception as exc:
            logger.warning(
                "ai_local_failed purpose=%s route=%s attempt=%d error=%s",
                purpose,
                route,
                attempt + 1,
                str(exc)[:200],
            )
            if "timed out" in str(exc).lower():
                break

    _memo_mark_failed(prompt)
    return None


def _try_local_transcribe(
    db: Session, *, purpose: str, content: bytes, mime_type: str, input_hash: str
) -> str | None:
    """Attempt local ASR. Returns None to mean "escalate". Never raises.

    One attempt only: whisper_client already handles its own failure modes and keeps a
    sticky flag, so a retry here would repeat a known-bad load.
    """
    if not settings.WHISPER_ENABLED or not whisper_client.handles_mime(mime_type):
        return None

    started = time.perf_counter()
    text = whisper_client.transcribe_bytes(content, mime_type=mime_type)
    if text is None:
        return None

    route = whisper_client.model_label()
    _store_cache(db, purpose, input_hash, {"text": text})
    _set_route(route)
    logger.info("ai_call purpose=%s route=%s latency=%.2f", purpose, route, time.perf_counter() - started)
    return text



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

    # `not files` rather than `files is None` so an empty list also takes the local path.
    if not files:
        local = _try_local_json(db, purpose=purpose, prompt=prompt, schema=schema, input_hash=input_hash)
        if local is not None:
            return local

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
            _set_route(f"gemini:{model_name}")
            logger.info("gemini_json purpose=%s model=%s latency=%.2f", purpose, model_name, time.perf_counter() - started)
            return parsed
        except Exception as exc:
            logger.warning("gemini_json_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))

    cached = _get_cached(db, purpose, input_hash)
    if cached:
        _set_route("fallback-cache")
        logger.info("ai_call purpose=%s route=fallback-cache", purpose)
        return schema.model_validate(cached)
    raise GenerationError(f"Gemini generation failed for {purpose} and no fallback cache is available")


def generate_text(db: Session, *, purpose: str, prompt: str, model: str | None = None) -> str:
    model_name = model or settings.GEMINI_FLASH_MODEL
    input_hash = _hash_input({"prompt": prompt, "model": model_name})

    local = _try_local_text(db, purpose=purpose, prompt=prompt, input_hash=input_hash)
    if local is not None:
        return local

    for attempt in range(3):
        try:
            response = _client().models.generate_content(model=model_name, contents=prompt)
            text = response.text or ""
            _store_cache(db, purpose, input_hash, {"text": text})
            _set_route(f"gemini:{model_name}")
            return text
        except Exception as exc:
            logger.warning("gemini_text_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
    cached = _get_cached(db, purpose, input_hash)
    if cached:
        _set_route("fallback-cache")
        logger.info("ai_call purpose=%s route=fallback-cache", purpose)
        return str(cached.get("text", ""))
    raise GenerationError(f"Gemini text generation failed for {purpose}")


def transcribe(db: Session, *, purpose: str, prompt: str, content: bytes, mime_type: str) -> str:
    model_name = settings.GEMINI_FLASH_MODEL
    input_hash = _hash_input({"prompt": prompt, "file": (len(content), mime_type), "model": model_name})

    # Audio goes to faster-whisper; PDF and image have no local vision model and fall through.
    local = _try_local_transcribe(
        db, purpose=purpose, content=content, mime_type=mime_type, input_hash=input_hash
    )
    if local is not None:
        return local

    contents: list[Any] = [prompt, types.Part.from_bytes(data=content, mime_type=mime_type)]
    for attempt in range(3):
        try:
            response = _client().models.generate_content(model=model_name, contents=contents)
            text = response.text or ""
            _store_cache(db, purpose, input_hash, {"text": text})
            _set_route(f"gemini:{model_name}")
            return text
        except Exception as exc:
            logger.warning("gemini_transcribe_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
    cached = _get_cached(db, purpose, input_hash)
    if cached:
        _set_route("fallback-cache")
        logger.info("ai_call purpose=%s route=fallback-cache", purpose)
        return str(cached.get("text", ""))
    raise GenerationError(f"Gemini transcription failed for {purpose}")


def upload_file(filepath: str) -> Any:
    """Upload a large media file through the shared Gemini gateway."""
    return _client().files.upload(file=filepath)


def wait_for_file(name: str, *, poll_interval: int = 2, max_wait: int = 180) -> Any:
    """Wait for a Gemini media upload to become active."""
    client = _client()
    elapsed = 0
    while elapsed < max_wait:
        media_file = client.files.get(name=name)
        state_name = getattr(media_file.state, "name", str(media_file.state))
        if state_name == "ACTIVE":
            return media_file
        if state_name == "FAILED":
            raise GenerationError("Gemini media processing failed")
        time.sleep(poll_interval)
        elapsed += poll_interval
    raise GenerationError("Gemini media processing timed out")


def generate_json_from_file(
    db: Session,
    *,
    purpose: str,
    prompt: str,
    schema: type[T],
    media_file: Any,
    model: str | None = None,
) -> T:
    """Generate structured JSON from an already-uploaded Gemini media file."""
    model_name = model or settings.GEMINI_FLASH_MODEL
    input_hash = _hash_input({"prompt": prompt, "file": getattr(media_file, "name", ""), "model": model_name})
    client = _client()
    for attempt in range(3):
        started = time.perf_counter()
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[media_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
            parsed = schema.model_validate_json(response.text or "{}")
            _store_cache(db, purpose, input_hash, parsed.model_dump(mode="json"))
            _set_route(f"gemini:{model_name}")
            logger.info("gemini_file_json purpose=%s model=%s latency=%.2f", purpose, model_name, time.perf_counter() - started)
            return parsed
        except Exception as exc:
            logger.warning("gemini_file_json_failed purpose=%s attempt=%s error=%s", purpose, attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
    cached = _get_cached(db, purpose, input_hash)
    if cached:
        _set_route("fallback-cache")
        logger.info("ai_call purpose=%s route=fallback-cache", purpose)
        return schema.model_validate(cached)
    raise GenerationError(f"Gemini file generation failed for {purpose} and no fallback cache is available")


def delete_file(name: str) -> None:
    """Delete a temporary Gemini media file through the shared gateway."""
    _client().files.delete(name=name)


def embed(texts: Sequence[str]) -> list[list[float]]:
    """Embed texts with the configured provider.

    Unlike every other helper, this NEVER crosses providers on failure. nomic-embed-text
    and text-embedding-004 are both 768-dimensional, so mixing them raises no error —
    pgvector accepts both — but the vector spaces are unrelated, and querying a corpus
    embedded by one with a vector from the other returns effectively random neighbours
    *silently*. Those wrong SOP chunks would then flow into path generation as grounding.

    So the provider is a config decision, and failure raises GenerationError into the
    callers' existing fallbacks: rag_service falls back to keyword search, seeds/run.py
    to deterministic_embedding.
    """
    items = list(texts)
    if not items:
        return []

    if settings.EMBEDDING_PROVIDER == "ollama":
        if settings.OLLAMA_ENABLED:
            # Consult the cached probe first: rag_service embeds on every copilot query and
            # path revision, so without this a stopped server costs a fresh connect timeout
            # per call instead of one probe per TTL window.
            if not ollama_client.is_available():
                raise GenerationError("Ollama is unavailable and EMBEDDING_PROVIDER=ollama")
            return ollama_client.embed_texts(items)
        # Loud, because this is the configuration that silently poisons retrieval.
        logger.error(
            "embedding_provider_conflict EMBEDDING_PROVIDER=ollama but OLLAMA_ENABLED=false — "
            "using Gemini, which risks a vector-space mismatch. Re-run app.scripts.reembed_sop."
        )

    if not settings.GEMINI_API_KEY:
        raise GenerationError("GEMINI_API_KEY is not configured")
    response = _client().models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=items,
        config={"output_dimensionality": 768},
    )
    return [list(item.values) for item in response.embeddings or []]
