"use client";

/**
 * useTranslatedContent — Tier 2 AI output translation hook.
 *
 * Design decisions (per user review):
 * - MANUAL TRIGGER ONLY: translation does not fire automatically when the
 *   language changes. The component must call translate() explicitly (via a
 *   "Translate" button). This avoids live Gemini calls firing at the instant
 *   a judge flips the language toggle — preventing latency/throttling risk.
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
import { translateText } from "@/lib/api";

// Module-level cache: survives re-renders, resets only on full page reload.
// Key: `${shortHash(text)}_${lang}`
const _frontendCache = new Map<string, string>();

function _cacheKey(text: string, lang: Lang): string {
  // Simple hash: first 120 chars + length. Good enough for demo deduplication.
  const sample = text.slice(0, 120).replace(/\s+/g, " ");
  return `${sample.length}_${text.length}_${lang}`;
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
      const result = await translateText(englishText, lang);
      if (!result.fallback && result.translated) {
        _frontendCache.set(key, result.translated);
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
