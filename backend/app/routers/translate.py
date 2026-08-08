"""Translate router — thin HTTP layer only.

POST /translate
  Body: { text: str, target_lang: "en"|"hi"|"gu" }
  Returns: { translated: str, fallback: bool, cached: bool }

POST /translate/batch
  Body: { items: [{ id, text }], target_lang: "en"|"hi"|"gu" }
  Returns: { results: [{ id, translated, fallback }] }
  Phase 14E: auto-translation puts many AI blocks on one page; batching keeps
  that to a single round trip.

Design notes:
- No audit event is written. Translation is a display transform; it does NOT
  mutate case data and is therefore not subject to the audit-every-mutation rule.
- No auth required — the endpoint only operates on text the caller already
  rendered from authenticated API responses. It cannot access or leak DB data.
- Translated text is cached (in-process + `fallback_cache` table) but is NEVER
  written back into case data. The DB remains the authoritative English source.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
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


class BatchItemIn(BaseModel):
    id: str
    text: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if len(v) > 20_000:
            raise ValueError("text must be ≤ 20,000 characters")
        return v


class TranslateBatchIn(BaseModel):
    items: list[BatchItemIn] = Field(min_length=1)
    target_lang: str

    @field_validator("target_lang")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        if v not in SUPPORTED:
            raise ValueError(f"target_lang must be one of {SUPPORTED}")
        return v

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: list[BatchItemIn]) -> list[BatchItemIn]:
        if len(v) > translate_service.MAX_BATCH_ITEMS:
            raise ValueError(f"items must be ≤ {translate_service.MAX_BATCH_ITEMS} entries")
        return v


class BatchItemOut(BaseModel):
    id: str
    translated: str
    fallback: bool


class TranslateBatchOut(BaseModel):
    results: list[BatchItemOut]


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


@router.post(
    "/batch",
    response_model=TranslateBatchOut,
    summary="Translate several AI-generated blocks in one round trip (display-only)",
)
def translate_text_batch(
    body: TranslateBatchIn,
    db: Session = Depends(get_db),
) -> TranslateBatchOut:
    """Batch counterpart to POST /translate.

    Each item falls back independently: if Gemini fails for one block, that
    block returns its original English with fallback=True while the rest still
    return translated text.
    """
    try:
        results = translate_service.translate_batch(
            db,
            items=[(item.id, item.text) for item in body.items],
            target_lang=body.target_lang,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return TranslateBatchOut(
        results=[
            BatchItemOut(id=item_id, translated=translated, fallback=is_fallback)
            for item_id, translated, is_fallback in results
        ]
    )
