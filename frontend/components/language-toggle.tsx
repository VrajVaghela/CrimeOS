"use client";

/**
 * LanguageToggle — compact 3-button language switcher.
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

import { interpolate, useLanguage, type Lang } from "@/lib/language-context";
import { ENDONYM_SHORT, SCRIPT_FONT_CLASS } from "@/lib/i18n/endonyms";

const LANGS: Lang[] = ["en", "hi", "gu"];

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className="flex items-center gap-0.5 rounded-squircle border border-border/60 bg-surface-alt/80 p-0.5"
      role="group"
      aria-label={t("common.select_language")}
    >
      {LANGS.map((code) => {
        const isActive = lang === code;
        const label = ENDONYM_SHORT[code];
        const fontClass = SCRIPT_FONT_CLASS[code];
        return (
          <button
            key={code}
            id={`lang-toggle-${code}`}
            onClick={() => setLang(code)}
            aria-pressed={isActive}
            aria-label={interpolate(t("common.switch_to"), { language: t(`common.language_${code}`) })}
            className={[
              "rounded-squircle-sm px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all duration-150",
              fontClass,
              isActive
                ? "border border-border bg-surface-elevated text-foreground"
                : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary",
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
