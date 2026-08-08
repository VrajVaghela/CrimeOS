"use client";

import { useEffect } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { ENDONYM_SHORT } from "@/lib/i18n/endonyms";
import { useTranslatedContent } from "@/hooks/use-translated-content";

interface TranslatedTextBlockProps {
  content: string;
  className?: string;
  /**
   * Phase 14E: defaults to true — when a language is selected, AI-generated
   * content follows it automatically, like every other surface. Pass `false`
   * only where the officer must see the original verbatim (the raw complaint
   * pane), which keeps a manual "Translate" button instead.
   */
  autoTranslate?: boolean;
}

export function TranslatedTextBlock({ content, className = "", autoTranslate = true }: TranslatedTextBlockProps) {
  const { lang, t } = useLanguage();
  const {
    text: displayContent,
    isTranslating,
    isFallback,
    isTranslated,
    translate,
  } = useTranslatedContent(content);

  useEffect(() => {
    if (autoTranslate && lang !== "en" && !isTranslating && !isTranslated && !isFallback) {
      void translate();
    }
  }, [autoTranslate, lang, isTranslating, isTranslated, isFallback, translate]);

  const showTranslateButton = lang !== "en" && !isTranslating && !isTranslated && !autoTranslate;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Action Row */}
      {(showTranslateButton || isTranslating || isTranslated || isFallback) && (
        <div className="flex items-center gap-2">
          {showTranslateButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void translate()}
              className="h-6 text-[10px] px-2 py-0"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {t("summary.translate_summary")}
            </Button>
          )}
          {isTranslating && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("common.translating")}
            </span>
          )}
          {isTranslated && !isFallback && (
            <span className="text-[10px] bg-primary/15 border border-primary/25 text-primary px-2 py-0.5 rounded-full font-mono">
              {ENDONYM_SHORT[lang]}
            </span>
          )}
          {isFallback && (
            <div className="flex items-center gap-1.5 rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {t("common.translation_unavailable")}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <pre className="text-sm leading-relaxed text-foreground font-sans whitespace-pre-wrap">
        {displayContent}
      </pre>
    </div>
  );
}
