/**
 * Native language names (endonyms) — Phase 14F.
 *
 * These are the ONLY Indic string literals allowed outside the dictionaries, and
 * they live here so the i18n audit has a single sanctioned location. A language
 * name is always written in its own script: a Gujarati speaker looks for
 * "ગુજ", not "Gujarati", no matter which language the UI is in.
 */
import type { Lang } from "@/lib/language-context";

/** Full native name, e.g. for the "translated into X" badge. */
export const ENDONYM: Record<Lang, string> = {
  en: "English",
  hi: "हिंदी",
  gu: "ગુજરાતી",
};

/** Compact form for the toggle buttons, which are width-constrained. */
export const ENDONYM_SHORT: Record<Lang, string> = {
  en: "EN",
  hi: "हिंदी",
  gu: "ગુજ",
};

/** Tailwind class that selects the correct Noto face for each script. */
export const SCRIPT_FONT_CLASS: Record<Lang, string> = {
  en: "font-mono",
  hi: "font-noto-devanagari",
  gu: "font-noto-gujarati",
};

/**
 * Safe lookup for a language code that came from the backend (e.g. Gemini's
 * detected complaint language), which is a plain string and may be unsupported.
 * Returns the raw code for anything we do not have an endonym for, and null when
 * there is nothing to show — callers decide the fallback copy.
 */
export function endonymFor(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = code.trim().toLowerCase();
  if (key in ENDONYM) return ENDONYM[key as Lang];
  return code;
}
