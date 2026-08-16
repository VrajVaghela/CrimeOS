"""
Ollama provider client — local LLM chat and embeddings.

Called only by app.ai.gemini_client (the single AI gateway), which owns routing,
retries, schema validation and the fallback cache. This module is a leaf: it imports
neither the gateway nor whisper_client, and never touches the database.

Design notes:
- `is_available()` is a TTL-cached liveness probe. Ollama being stopped is a normal
  state, so a down server must cost one short timeout per TTL window rather than a
  retry storm on every AI call. Same shape as video_service._get_video_duration's
  handling of a missing ffprobe: warn, degrade, never crash.
- Raw response text is returned unparsed. Schema knowledge stays in the gateway so
  this client has no opinion about Pydantic.
- trust_env=False on every client: httpx honours HTTP_PROXY/ALL_PROXY by default, and
  routing localhost through a corporate proxy fails in confusing ways.
"""
import json
import logging
import threading
import time
from collections.abc import Sequence
from typing import Any

import httpx

from app.config import settings
from app.exceptions import GenerationError

logger = logging.getLogger("crime_os.ai.ollama")

_probe_lock = threading.Lock()
# (checked_at_monotonic, is_up). checked_at 0.0 forces a probe on first use.
_probe_state: tuple[float, bool] = (0.0, False)
_models_warned: bool = False


def chat_model_label() -> str:
    """Canonical provenance label for the local chat model."""
    return f"ollama:{settings.OLLAMA_CHAT_MODEL}"


def embed_model_label() -> str:
    """Canonical provenance label for the local embedding model."""
    return f"ollama:{settings.OLLAMA_EMBED_MODEL}"


# Measured chars-per-token for qwen2.5:3b, which drives the prompt budget below.
# A flat character limit is wrong for this app: Indic scripts cost far more tokens per
# character than Latin, so 24k chars of English fits in 8192 tokens while the same length
# of Gujarati needs ~35k. Overflowing silently drops the FRONT of the prompt — the
# instructions — and yields confidently wrong output.
# Calibrated against real prompt_eval_count from qwen2.5:3b (3000-char samples):
#   Latin 3.24 ch/tok, Devanagari 0.86, Gujarati 0.56.
# The constants below are set slightly BELOW the measured ratios so the estimate always
# comes out high — over-estimating routes a borderline prompt to Gemini (safe), while
# under-estimating lets num_ctx silently drop the front of the prompt (corrupt).
_CHARS_PER_TOKEN_LATIN = 3.0
_CHARS_PER_TOKEN_DEVANAGARI = 0.80
_CHARS_PER_TOKEN_GUJARATI = 0.52


def estimate_tokens(text: str) -> int:
    """Approximate the token count of a prompt, weighting each script by its real cost.

    Deliberately pessimistic: over-estimating sends a borderline prompt to Gemini, which is
    the safe direction, while under-estimating corrupts the prompt silently.
    """
    devanagari = 0
    gujarati = 0
    for char in text:
        if "ऀ" <= char <= "ॿ":  # Devanagari (Hindi)
            devanagari += 1
        elif "઀" <= char <= "૿":  # Gujarati
            gujarati += 1
    latin = len(text) - devanagari - gujarati
    return (
        int(latin / _CHARS_PER_TOKEN_LATIN)
        + int(devanagari / _CHARS_PER_TOKEN_DEVANAGARI)
        + int(gujarati / _CHARS_PER_TOKEN_GUJARATI)
    )


def prompt_token_budget() -> int:
    """Tokens a prompt may occupy, reserving room in the context window for the response."""
    return max(512, settings.OLLAMA_NUM_CTX - settings.OLLAMA_OUTPUT_TOKEN_RESERVE)


def _timeout() -> httpx.Timeout:
    """Split timeouts: a server that dies between probe and call fails fast on connect."""
    return httpx.Timeout(
        connect=settings.OLLAMA_CONNECT_TIMEOUT_SECONDS,
        read=settings.OLLAMA_TIMEOUT_SECONDS,
        write=10.0,
        pool=5.0,
    )


def _warn_on_missing_models(payload: dict[str, Any]) -> None:
    """Warn once if a configured model is not pulled. /api/chat does not auto-pull."""
    global _models_warned
    if _models_warned:
        return
    _models_warned = True
    try:
        names = set()
        for entry in payload.get("models") or []:
            name = str(entry.get("name", ""))
            if name:
                names.add(name if ":" in name else f"{name}:latest")
        for configured in (settings.OLLAMA_CHAT_MODEL, settings.OLLAMA_EMBED_MODEL):
            normalized = configured if ":" in configured else f"{configured}:latest"
            if normalized not in names:
                logger.warning(
                    "ollama_model_missing model=%s available=%s — pull it or local routing will 404",
                    normalized,
                    sorted(names),
                )
    except Exception as exc:  # never let a diagnostic break the probe
        logger.debug("ollama_model_check_failed error=%s", exc)


def is_available() -> bool:
    """TTL-cached liveness probe against GET /api/tags. Never raises.

    Negative results are cached too, so a stopped server costs at most one short
    timeout per OLLAMA_PROBE_TTL_SECONDS window across the whole app.
    """
    global _probe_state
    if not settings.OLLAMA_ENABLED:
        return False

    checked_at, was_up = _probe_state
    now = time.monotonic()
    if now - checked_at < settings.OLLAMA_PROBE_TTL_SECONDS:
        return was_up

    with _probe_lock:
        # Re-check: a concurrent caller may have probed while we waited for the lock.
        checked_at, was_up = _probe_state
        now = time.monotonic()
        if now - checked_at < settings.OLLAMA_PROBE_TTL_SECONDS:
            return was_up

        is_up = False
        try:
            with httpx.Client(
                base_url=settings.OLLAMA_BASE_URL,
                timeout=settings.OLLAMA_PROBE_TIMEOUT_SECONDS,
                trust_env=False,
            ) as client:
                response = client.get("/api/tags")
                is_up = response.status_code == 200
                if is_up:
                    _warn_on_missing_models(response.json())
        except Exception as exc:
            logger.info("ollama_unavailable url=%s error=%s", settings.OLLAMA_BASE_URL, type(exc).__name__)

        if is_up and not was_up:
            logger.info("ollama_available url=%s model=%s", settings.OLLAMA_BASE_URL, settings.OLLAMA_CHAT_MODEL)
        _probe_state = (time.monotonic(), is_up)
        return is_up


def _post_chat(body: dict[str, Any]) -> str:
    """POST /api/chat and return message.content. Raises GenerationError on any failure."""
    try:
        with httpx.Client(
            base_url=settings.OLLAMA_BASE_URL,
            timeout=_timeout(),
            trust_env=False,
        ) as client:
            response = client.post("/api/chat", json=body)
    except httpx.TimeoutException as exc:
        raise GenerationError(f"Ollama timed out after {settings.OLLAMA_TIMEOUT_SECONDS}s") from exc
    except httpx.HTTPError as exc:
        raise GenerationError(f"Ollama request failed: {exc}") from exc

    if response.status_code != 200:
        # A grammar that llama.cpp cannot compile surfaces here as a 400.
        raise GenerationError(f"Ollama returned HTTP {response.status_code}: {response.text[:300]}")

    try:
        content = response.json()["message"]["content"]
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        raise GenerationError(f"Ollama returned a malformed chat response: {exc}") from exc

    if not isinstance(content, str) or not content.strip():
        raise GenerationError("Ollama returned an empty chat response")
    return content


def _options() -> dict[str, Any]:
    return {"num_ctx": settings.OLLAMA_NUM_CTX, "temperature": settings.OLLAMA_TEMPERATURE}


def chat_json(*, prompt: str, system: str, schema_json: dict[str, Any] | None) -> str:
    """Generate JSON from the local chat model. Returns raw text for the caller to validate.

    schema_json constrains decoding via a compiled grammar. Pass None to fall back to
    plain JSON mode, which is the recovery path when a schema will not compile.
    """
    body: dict[str, Any] = {
        "model": settings.OLLAMA_CHAT_MODEL,
        "stream": False,
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
        "options": _options(),
        "format": schema_json if schema_json is not None else "json",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    return _post_chat(body)


def chat_text(*, prompt: str, system: str | None = None) -> str:
    """Generate free text from the local chat model."""
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    body: dict[str, Any] = {
        "model": settings.OLLAMA_CHAT_MODEL,
        "stream": False,
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
        "options": _options(),
        "messages": messages,
    }
    return _post_chat(body)


def embed_texts(texts: Sequence[str]) -> list[list[float]]:
    """Embed texts via POST /api/embed. Raises GenerationError on failure or dimension mismatch."""
    items = list(texts)
    if not items:
        return []

    body = {"model": settings.OLLAMA_EMBED_MODEL, "input": items}
    try:
        with httpx.Client(
            base_url=settings.OLLAMA_BASE_URL,
            timeout=_timeout(),
            trust_env=False,
        ) as client:
            response = client.post("/api/embed", json=body)
    except httpx.TimeoutException as exc:
        raise GenerationError("Ollama embedding request timed out") from exc
    except httpx.HTTPError as exc:
        raise GenerationError(f"Ollama embedding request failed: {exc}") from exc

    if response.status_code != 200:
        raise GenerationError(f"Ollama embedding returned HTTP {response.status_code}: {response.text[:200]}")

    try:
        vectors = [[float(value) for value in vector] for vector in response.json()["embeddings"]]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise GenerationError(f"Ollama returned a malformed embedding response: {exc}") from exc

    if len(vectors) != len(items):
        raise GenerationError(f"Ollama returned {len(vectors)} embeddings for {len(items)} inputs")

    # Guard the pgvector column contract here: a wrong OLLAMA_EMBED_MODEL would otherwise
    # surface as a psycopg error deep inside an unrelated db.flush().
    expected = settings.OLLAMA_EMBED_DIM
    for vector in vectors:
        if len(vector) != expected:
            raise GenerationError(
                f"Ollama model {settings.OLLAMA_EMBED_MODEL} returned {len(vector)} dimensions, expected {expected}"
            )
    return vectors
