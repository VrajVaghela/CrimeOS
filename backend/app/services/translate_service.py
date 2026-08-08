"""Translation service — display-layer only.

Design decisions (per user review):
- This is a DISPLAY TRANSFORM, not a case-data mutation.
  → No audit_events are written.
  → Translated text is NEVER stored in the DB or fed back into
    case_sections.reasoning or any other authoritative field.
  → The Legal Advisor's verification surface always shows authoritative
    English text; translated views are presentation-only.

- TRANSLATION_PROMPT lives in prompts.py (architecture rule: no inline prompts).
- All Gemini calls go through gemini_client.generate_text() (architecture rule).
- Two-tier cache (Phase 14E):
    1. In-process dict — fastest, but wiped by `uvicorn --reload`.
    2. `fallback_cache` table — survives restarts, so the second run of a demo
       costs no Gemini quota. Both are keyed on (sha256(text), target_lang).
  This matters more since 14E made AI content auto-translate: a page with a
  dozen AI blocks would otherwise re-bill every block on every reload.

- Fallback: on GenerationError, returns original English text with fallback=True.
  The frontend shows a small "Translation unavailable" indicator — the demo
  cannot show a blank or broken UI state.
"""
from __future__ import annotations

import hashlib
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import gemini_client
from app.ai.prompts import TRANSLATION_PROMPT
from app.exceptions import GenerationError
from app.models import FallbackCache

logger = logging.getLogger("crime_os.translate")

# Supported target languages.
SUPPORTED_LANGS: frozenset[str] = frozenset({"en", "hi", "gu"})

# Cap for a single batch request — keeps one page render to one round trip
# without letting a caller queue an unbounded number of Gemini calls.
MAX_BATCH_ITEMS = 25

_LANG_DISPLAY: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "gu": "Gujarati",
}

# In-memory cache: (text_hash, target_lang) → translated string.
# Keyed on first 500 chars of the text to avoid huge keys.
_cache: dict[tuple[str, str], str] = {}


def _text_hash(text: str) -> str:
    return hashlib.sha256(text[:500].encode("utf-8")).hexdigest()


def _cache_purpose(target_lang: str) -> str:
    return f"translate_text_{target_lang}"


def _read_durable(db: Session, text_hash: str, target_lang: str) -> str | None:
    """Read a previously stored translation from the fallback_cache table."""
    row = db.scalar(
        select(FallbackCache).where(
            FallbackCache.purpose == _cache_purpose(target_lang),
            FallbackCache.input_hash == text_hash,
        )
    )
    if row and isinstance(row.response_json, dict):
        value = row.response_json.get("translated")
        if isinstance(value, str) and value:
            return value
    return None


def _write_durable(db: Session, text_hash: str, target_lang: str, translated: str) -> None:
    """Persist a translation so it survives a backend restart."""
    purpose = _cache_purpose(target_lang)
    row = db.scalar(
        select(FallbackCache).where(
            FallbackCache.purpose == purpose,
            FallbackCache.input_hash == text_hash,
        )
    )
    if row:
        row.response_json = {"translated": translated}
    else:
        db.add(
            FallbackCache(
                purpose=purpose,
                input_hash=text_hash,
                response_json={"translated": translated},
            )
        )
    db.commit()


def translate(
    db: Session,
    *,
    text: str,
    target_lang: str,
) -> tuple[str, bool]:
    """Translate *text* into *target_lang*.

    Returns:
        (translated_text, is_fallback)
        is_fallback is True when Gemini failed and the original English was
        returned. The router surfaces this so the frontend can show a
        "Translation unavailable" indicator.

    Raises:
        ValueError: if target_lang is not in SUPPORTED_LANGS.
    """
    if target_lang not in SUPPORTED_LANGS:
        raise ValueError(f"Unsupported target language: {target_lang!r}. Must be one of {SUPPORTED_LANGS}")

    # Short-circuit for English — no Gemini call needed.
    if target_lang == "en":
        return text, False

    if not text or not text.strip():
        return text, False

    cache_key = (_text_hash(text), target_lang)
    if cache_key in _cache:
        logger.debug("translate cache_hit lang=%s", target_lang)
        return _cache[cache_key], False

    # Durable cache — survives a backend restart, so repeat demos cost no quota.
    durable = _read_durable(db, cache_key[0], target_lang)
    if durable:
        _cache[cache_key] = durable
        logger.debug("translate durable_hit lang=%s", target_lang)
        return durable, False

    prompt = TRANSLATION_PROMPT.format(
        target_language=_LANG_DISPLAY[target_lang],
        text=text,
    )

    try:
        result = gemini_client.generate_text(
            db,
            purpose=f"translate_{target_lang}",
            prompt=prompt,
        )
        translated = result.strip() or text
        _cache[cache_key] = translated
        _write_durable(db, cache_key[0], target_lang, translated)
        logger.info("translate success lang=%s chars=%d", target_lang, len(translated))
        return translated, False
    except GenerationError as exc:
        logger.warning("translate fallback lang=%s error=%s", target_lang, exc)
        return text, True


def translate_batch(
    db: Session,
    *,
    items: list[tuple[str, str]],
    target_lang: str,
) -> list[tuple[str, str, bool]]:
    """Translate several texts in one call.

    Phase 14E: auto-translation means a single page can hold a dozen AI blocks.
    Batching collapses those into one HTTP round trip; cache hits cost nothing,
    and only genuine misses reach Gemini.

    Args:
        items: (id, text) pairs. The id is echoed back so the caller can match
            results without relying on ordering.

    Returns:
        A list of (id, translated_text, is_fallback) in the same order.

    Raises:
        ValueError: on unsupported language or an over-sized batch.
    """
    if target_lang not in SUPPORTED_LANGS:
        raise ValueError(f"Unsupported target language: {target_lang!r}. Must be one of {SUPPORTED_LANGS}")
    if len(items) > MAX_BATCH_ITEMS:
        raise ValueError(f"batch is limited to {MAX_BATCH_ITEMS} items, got {len(items)}")

    results: list[tuple[str, str, bool]] = []
    for item_id, text in items:
        translated, is_fallback = translate(db, text=text, target_lang=target_lang)
        results.append((item_id, translated, is_fallback))
    return results
