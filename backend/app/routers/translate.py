"""Translate router — thin HTTP layer only.

POST /translate
  Body: { text: str, target_lang: "en"|"hi"|"gu" }
  Returns: { translated: str, fallback: bool, cached: bool }

Design notes:
- No audit event is written. Translation is a display transform; it does NOT
  mutate case data and is therefore not subject to the audit-every-mutation rule.
- No auth required — the endpoint only operates on text the caller already
  rendered from authenticated API responses. It cannot access or leak DB data.
- Translated text is NEVER persisted. The DB is always the authoritative
  English source. Translations exist only in the in-memory service cache and
  the frontend's module-level Map.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import translate_service

logger = logging.getLogger("crime_os.routers.translate")

router = APIRouter(prefix="/translate", tags=["translate"])

SUPPORTED = {"en", "hi", "gu"}


class TranslateIn(BaseModel):
    text: str
    target_lang: str

    @field_validator("target_lang")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        if v not in SUPPORTED:
            raise ValueError(f"target_lang must be one of {SUPPORTED}")
        return v

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if len(v) > 20_000:
            raise ValueError("text must be ≤ 20,000 characters")
        return v


class TranslateOut(BaseModel):
    translated: str
    fallback: bool  # True = Gemini failed; original English returned
    cached: bool    # True = served from in-memory cache (no new API call)


@router.post(
    "",
    response_model=TranslateOut,
    summary="Translate AI-generated text into Hindi or Gujarati (display-only)",
)
def translate_text(
    body: TranslateIn,
    db: Session = Depends(get_db),
) -> TranslateOut:
    """Translate police investigation text while preserving legal identifiers.

    If Gemini is unavailable, returns the original English text with
    fallback=True so the frontend can display a 'Translation unavailable'
    indicator rather than a blank or broken state.
    """
    try:
        from app.services.translate_service import _cache, _text_hash  # noqa: PLC0415

        cache_key = (_text_hash(body.text), body.target_lang)
        was_cached = cache_key in _cache

        translated, is_fallback = translate_service.translate(
            db,
            text=body.text,
            target_lang=body.target_lang,
        )
        return TranslateOut(
            translated=translated,
            fallback=is_fallback,
            cached=was_cached and not is_fallback,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
