"use client";

/**
 * LanguageToggle — compact 3-button EN / हिंदी / ગુજ switcher.
 *
 * Uses design tokens only — no hardcoded colors per architecture rules.
 * Active language: bg-primary/15 border-primary/30 text-primary (Tier 1 UI rule).
 * Inactive: text-muted-foreground with subtle hover.
 *
 * Fonts:
 * - Hindi label uses var(--font-noto-devanagari) via the `font-noto-devanagari` class
 * - Gujarati label uses var(--font-noto-gujarati) via the `font-noto-gujarati` class
 * Both are already loaded in layout.tsx.
 */

import { useLanguage, type Lang } from "@/lib/language-context";

const LANGS: { code: Lang; label: string; fontClass: string }[] = [
  { code: "en", label: "EN", fontClass: "font-mono" },
  { code: "hi", label: "हिंदी", fontClass: "font-noto-devanagari" },
  { code: "gu", label: "ગુજ", fontClass: "font-noto-gujarati" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-surface-alt/80 p-0.5"
      role="group"
      aria-label="Select interface language"
    >
      {LANGS.map(({ code, label, fontClass }) => {
        const isActive = lang === code;
        return (
          <button
            key={code}
            id={`lang-toggle-${code}`}
            onClick={() => setLang(code)}
            aria-pressed={isActive}
            aria-label={`Switch to ${code === "en" ? "English" : code === "hi" ? "Hindi" : "Gujarati"}`}
            className={[
              "rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all duration-150",
              fontClass,
              isActive
                ? "bg-primary/15 border border-primary/30 text-primary shadow-sm"
                : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
