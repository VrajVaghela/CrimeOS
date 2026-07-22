"use client";

/**
 * Language context for Crime OS AI.
 *
 * Design decisions (per user review):
 * - Language preference is persisted to localStorage so it survives page reloads.
 * - useT(key) resolves dot-notation keys against the active dictionary.
 *   MISSING KEY FALLBACK: if a key is not present in hi/gu, the English value
 *   is returned silently. A half-translated demo looks worse if it shows raw
 *   keys or blank text than if it gracefully falls back to English.
 * - This context provides ONLY static UI strings. AI-generated content is
 *   translated via the separate useTranslatedContent() hook (Tier 2).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import en, { type Dictionary } from "@/lib/i18n/en";
import hi from "@/lib/i18n/hi";
import gu from "@/lib/i18n/gu";

export type Lang = "en" | "hi" | "gu";

const DICTIONARIES: Record<Lang, Dictionary> = { en, hi, gu };
const STORAGE_KEY = "crime_os_lang";
const DEFAULT_LANG: Lang = "en";

// ---------------------------------------------------------------------------
// Dot-notation key resolver
// ---------------------------------------------------------------------------
type DotKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? DotKeys<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never;
    }[keyof T]
  : never;

export type TranslationKey = DotKeys<Dictionary>;

function resolve(dict: Dictionary, key: string): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dict;
  for (const part of parts) {
    if (node && typeof node === "object" && part in node) {
      node = node[part];
    } else {
      return ""; // not found in this dictionary
    }
  }
  return typeof node === "string" ? node : "";
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translates a dot-notation key. Falls back to English, then to the raw key. */
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && stored in DICTIONARIES) {
        setLangState(stored);
      }
    } catch {
      // localStorage unavailable (SSR or private mode) — use default
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      // 1. Try active language
      const active = resolve(DICTIONARIES[lang], key as string);
      if (active) return active;
      // 2. Fall back to English (missing key in hi/gu dictionary)
      const fallback = resolve(en, key as string);
      if (fallback) return fallback;
      // 3. Last resort: return the key itself (should never happen if en.ts is complete)
      return key as string;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
