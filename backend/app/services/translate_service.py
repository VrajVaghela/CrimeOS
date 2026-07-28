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
- In-memory dict cache (sha256 key + target_lang).
  ⚠ DEMO RISK: uvicorn --reload wipes this cache on any backend file save.
    Pre-warm for Case 1 and Case 2 right before the demo rehearsal.

- Fallback: on GenerationError, returns original English text with fallback=True.
  The frontend shows a small "Translation unavailable" indicator — the demo
  cannot show a blank or broken UI state.
"""
from __future__ import annotations

import hashlib
import logging

from sqlalchemy.orm import Session

from app.ai import gemini_client
from app.ai.prompts import TRANSLATION_PROMPT
from app.exceptions import GenerationError

logger = logging.getLogger("crime_os.translate")

# Supported target languages.
SUPPORTED_LANGS: frozenset[str] = frozenset({"en", "hi", "gu"})

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
        logger.info("translate success lang=%s chars=%d", target_lang, len(translated))
        return translated, False
    except GenerationError as exc:
        logger.warning("translate fallback lang=%s error=%s", target_lang, exc)
        return text, True
