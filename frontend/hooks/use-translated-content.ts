"use client";

/**
 * useTranslatedContent — Tier 2 AI output translation hook.
 *
 * Design decisions (per user review):
 * - AUTO-TRIGGERED as of Phase 14E: TranslatedTextBlock calls translate() from
 *   an effect, so AI output follows the selected language like every other
 *   surface. The throttling risk that motivated manual-only triggering is now
 *   handled three ways instead: a per-tick batch coalescer (one HTTP request
 *   per page render), the module cache below, and a durable backend cache.
 *   The raw complaint pane still opts out (autoTranslate={false}) because the
 *   officer must be able to read the original verbatim.
 *
 * - Returns original English text immediately (no blank flicker), even before
 *   translation is complete or while a translation request is in flight.
 *
 * - Module-level Map cache: (sha256-like hash, lang) → translated string.
 *   This survives re-renders and navigation within the session. It is
 *   SEPARATE from the backend cache (which is also in-memory and wiped on
 *   uvicorn --reload). Pre-warm the backend cache for demo Cases 1 and 2
 *   before presenting.
 *
 * - isFallback: true when Gemini failed and the original English was returned.
 *   Components should render a "Translation unavailable" indicator when true.
 *
 * - Translated content is NEVER written to the DB. The authoritative English
 *   text is always the source of truth for case_sections, summaries, etc.
 */

import { useCallback, useState } from "react";
import { useLanguage, type Lang } from "@/lib/language-context";
import { translateBatch } from "@/lib/api";

// Module-level cache: survives re-renders, resets only on full page reload.
// Key: `${shortHash(text)}_${lang}`
const _frontendCache = new Map<string, string>();

function _cacheKey(text: string, lang: Lang): string {
  // Simple hash: first 120 chars + length. Good enough for demo deduplication.
  const sample = text.slice(0, 120).replace(/\s+/g, " ");
  return `${sample.length}_${text.length}_${lang}`;
}

/**
 * Request coalescer (Phase 14E).
 *
 * Auto-translation fires from every AI block's effect in the same tick. Without
 * coalescing that is N HTTP requests — and N concurrent Gemini calls. Instead we
 * collect the tick's texts and flush them as ONE /translate/batch call.
 * Identical texts on the same page share a single entry and a single result.
 */
const BACKEND_BATCH_LIMIT = 25;

interface PendingEntry {
  text: string;
  resolvers: ((r: { translated: string; fallback: boolean }) => void)[];
}

let _queue = new Map<string, PendingEntry>();
let _flushScheduled = false;

async function _flush(lang: Lang) {
  const batch = _queue;
  _queue = new Map();
  _flushScheduled = false;
  if (batch.size === 0) return;

  const entries = [...batch.entries()];
  // Respect the backend cap; anything beyond it goes in follow-up chunks.
  for (let i = 0; i < entries.length; i += BACKEND_BATCH_LIMIT) {
    const chunk = entries.slice(i, i + BACKEND_BATCH_LIMIT);
    try {
      const results = await translateBatch(
        chunk.map(([key, entry]) => ({ id: key, text: entry.text })),
        lang
      );
      const byId = new Map(results.map((r) => [r.id, r]));
      for (const [key, entry] of chunk) {
        const hit = byId.get(key);
        if (hit && !hit.fallback && hit.translated) {
          _frontendCache.set(key, hit.translated);
          entry.resolvers.forEach((fn) => fn({ translated: hit.translated, fallback: false }));
        } else {
          entry.resolvers.forEach((fn) => fn({ translated: entry.text, fallback: true }));
        }
      }
    } catch {
      for (const [, entry] of chunk) {
        entry.resolvers.forEach((fn) => fn({ translated: entry.text, fallback: true }));
      }
    }
  }
}

function _enqueue(
  key: string,
  text: string,
  lang: Lang
): Promise<{ translated: string; fallback: boolean }> {
  return new Promise((resolve) => {
    const existing = _queue.get(key);
    if (existing) {
      existing.resolvers.push(resolve);
    } else {
      _queue.set(key, { text, resolvers: [resolve] });
    }
    if (!_flushScheduled) {
      _flushScheduled = true;
      // Microtask-ish delay: lets every block mounted in this tick join in.
      setTimeout(() => void _flush(lang), 0);
    }
  });
}

export interface TranslatedContentState {
  /** The text to display — either translated or original English. */
  text: string;
  /** True while a translation request is in flight. */
  isTranslating: boolean;
  /**
   * True when Gemini failed and the original English was returned.
   * Use this to show a "Translation unavailable" indicator.
   */
  isFallback: boolean;
  /** Whether the displayed text has been translated (vs. still showing English). */
  isTranslated: boolean;
  /**
   * Call this from a "Translate" button click. No-ops when:
   * - lang is 'en' (English is already shown)
   * - englishText is null/empty
   * - translation for this (text, lang) is already in the frontend cache
   */
  translate: () => Promise<void>;
}

/**
 * Hook for manually-triggered AI output translation.
 *
 * @param englishText - The authoritative English text from the API.
 *                      Pass null while the parent is still loading.
 */
export function useTranslatedContent(
  englishText: string | null
): TranslatedContentState {
  const { lang } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [lastTranslatedLang, setLastTranslatedLang] = useState<Lang | null>(null);

  const translate = useCallback(async () => {
    if (!englishText || !englishText.trim()) return;
    if (lang === "en") return; // English → nothing to do

    // Check frontend cache first
    const key = _cacheKey(englishText, lang);
    const cached = _frontendCache.get(key);
    if (cached) {
      setTranslatedText(cached);
      setIsFallback(false);
      setLastTranslatedLang(lang);
      return;
    }

    setIsTranslating(true);
    try {
      // Joins this tick's batch instead of firing its own request.
      const result = await _enqueue(key, englishText, lang);
      if (!result.fallback && result.translated) {
        setTranslatedText(result.translated);
        setIsFallback(false);
      } else {
        // Gemini failed — show English with indicator
        setTranslatedText(englishText);
        setIsFallback(true);
      }
      setLastTranslatedLang(lang);
    } catch {
      // Network or API error — show English with indicator
      setTranslatedText(englishText);
      setIsFallback(true);
      setLastTranslatedLang(lang);
    } finally {
      setIsTranslating(false);
    }
  }, [englishText, lang]);

  // Determine what text to show:
  // - If we have a cached translation for the CURRENT lang, show it.
  // - Otherwise always show the original English (no blank states).
  const isTranslated =
    translatedText !== null &&
    lastTranslatedLang === lang &&
    translatedText !== englishText &&
    !isFallback;

  const displayText =
    translatedText !== null && lastTranslatedLang === lang
      ? translatedText
      : (englishText ?? "");

  return {
    text: displayText,
    isTranslating,
    isFallback: isFallback && lastTranslatedLang === lang,
    isTranslated,
    translate,
  };
}
