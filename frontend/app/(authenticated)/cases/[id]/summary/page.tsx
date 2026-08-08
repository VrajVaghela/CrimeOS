"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Radar,
  Sparkles,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  History,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCaseSummaries, generateSummary, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { ENDONYM_SHORT } from "@/lib/i18n/endonyms";
import { useFormatters } from "@/lib/format";
import { useTranslatedContent } from "@/hooks/use-translated-content";
import type { CaseSummaryOut } from "@/lib/types";

export default function SummaryPage() {
  const params = useParams();
  const caseId = params.id as string;


  const [summaries, setSummaries] = useState<CaseSummaryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { lang, t } = useLanguage();
  const { formatDateTime } = useFormatters();

  useEffect(() => {
    if (caseId) void loadSummaries();
  }, [caseId]);

  async function loadSummaries() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCaseSummaries(caseId);
      setSummaries(data);
      if (data.length > 0) setSelectedId(data[0].id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load summaries");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const newSummary = await generateSummary(caseId);
      setSummaries((prev) => [newSummary, ...prev]);
      setSelectedId(newSummary.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Summary generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const selected = summaries.find((s) => s.id === selectedId);

  // Tier 2 (Phase 14E): the summary follows the selected language automatically.
  const {
    text: displayContent,
    isTranslating,
    isFallback,
    isTranslated,
    translate: triggerTranslation,
  } = useTranslatedContent(selected?.content ?? null);

  useEffect(() => {
    if (lang !== "en" && selected && !isTranslating && !isTranslated && !isFallback) {
      void triggerTranslation();
    }
  }, [lang, selected, isTranslating, isTranslated, isFallback, triggerTranslation]);

  // Manual retry stays available only when auto-translation fell back.
  const showTranslateButton = lang !== "en" && selected && !isTranslating && isFallback;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            {t("summary.title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("summary.subtitle")}
          </p>
        </div>
        {/* Red primary CTA button per Phase 9E spec */}
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary text-primary-foreground font-medium text-sm h-9 px-4 rounded-squircle-sm hover:scale-105 hover:bg-primary/90 glow-primary transition-all duration-[130ms] flex items-center gap-2"
          id="btn-generate-summary"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? (t("summary.generating" as any) || "Generating...") : (t("summary.generate" as any) || "Generate New Summary")}
        </Button>
      </div>

      {error && (
        <div className="animate-fade-down rounded-[12px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-squircle bg-card border border-border p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Radar className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-heading font-semibold text-lg">{t("summary.no_summary")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("summary.no_summary_sub")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Version sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              {t("common.version_history")}
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {summaries.length}
              </Badge>
            </h3>
            <div className="flex flex-col gap-2">
              {summaries.map((s, idx) => {
                const isSelected = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={[
                      "w-full text-left rounded-[12px] p-4 border transition-all text-xs font-mono flex flex-col gap-1.5",
                      "animate-fade-up",
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground glow-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-surface-elevated hover:text-foreground hover:border-primary/30",
                    ].join(" ")}
                    style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                  >
                    <div className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Version {s.version}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(s.generated_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary content — warm surface card per Phase 9E spec */}
          <div className="lg:col-span-3">
            {selected && (
              <div
                className="relative overflow-hidden rounded-squircle border border-info/20 animate-fade-up delay-200"
                style={{ background: "var(--surface-warm)" }}
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "var(--gradient-accent-info-h)" }} />

                <div className="p-6 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-heading text-base font-bold flex items-center gap-2.5">
                        {/* Blue AI icon per Phase 9E spec */}
                        <div className="rounded-squircle-sm bg-info/15 border border-info/30 p-1.5 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-info" />
                        </div>
                        AI {t("summary.title" as any) || "Case Summary"} — Version {selected.version}
                        {isTranslated && (
                          <span className="text-[10px] bg-primary/15 border border-primary/25 text-primary px-2 py-0.5 rounded-full font-mono">
                            {ENDONYM_SHORT[lang]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Generated by Gemini at{" "}
                        {formatDateTime(selected.generated_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {showTranslateButton && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void triggerTranslation()}
                          className="text-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("summary.translate_summary" as any) || "Translate Summary"}
                        </Button>
                      )}
                      {isTranslating && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("common.translating" as any) || "Translating..."}
                        </span>
                      )}
                      <Badge variant="info" className="font-mono text-xs rounded-full shrink-0">
                        v{selected.version}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  {isFallback && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("common.translation_unavailable" as any) || "Translation unavailable"}
                    </div>
                  )}
                  <div className="bg-background border border-info/30 rounded-squircle-sm p-5">
                    <pre className="text-sm leading-relaxed text-foreground font-sans whitespace-pre-wrap">
                      {displayContent}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
