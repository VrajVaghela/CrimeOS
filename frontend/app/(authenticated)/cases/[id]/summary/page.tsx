"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Clock, History, Loader2, Radar, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCaseSummaries, generateSummary, ApiError } from "@/lib/api";
import { interpolate, useLanguage } from "@/lib/language-context";
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
      setError(e instanceof ApiError ? e.message : t("summary.load_error"));
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
      setError(e instanceof ApiError ? e.message : t("summary.generate_error"));
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
    <div className="flex animate-fade-up flex-col gap-6">
      <PageHeader
        level="section"
        title={t("summary.title")}
        description={t("summary.subtitle")}
        actions={
          <Button
            onClick={handleGenerate}
            disabled={generating}
            loading={generating}
            id="btn-generate-summary"
          >
            {!generating && <Sparkles className="h-4 w-4" />}
            {generating ? t("summary.generating") : t("summary.generate")}
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="h-40 rounded-squircle lg:col-span-1" />
          <Skeleton className="h-96 rounded-squircle lg:col-span-3" />
        </div>
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={Radar}
          title={t("summary.no_summary")}
          description={t("summary.no_summary_sub")}
          action={{ label: t("summary.generate"), onClick: handleGenerate, icon: Sparkles }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Version rail */}
          <div className="flex flex-col gap-3 lg:col-span-1">
            <h3 className="flex items-center gap-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              {t("common.version_history")}
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {summaries.length}
              </Badge>
            </h3>
            <ul className="flex flex-col gap-2">
              {summaries.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex w-full flex-col gap-1.5 rounded-squircle-sm border p-3 text-left transition-colors duration-200 ${
                        isSelected
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-card hover:border-border/60"
                      }`}
                    >
                      <span className="font-heading text-sm font-semibold text-foreground">
                        {interpolate(t("summary.version_label"), { version: s.version })}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(s.generated_at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The summary is machine-authored, so it lives in the Info Blue
              partition like every other AI surface. The warm card and red-to-blue
              hairline it used to carry claimed a significance a draft document
              does not have, and put a gradient somewhere that is not a data path. */}
          <div className="lg:col-span-3">
            {selected && (
              <div className="rounded-squircle border border-info/30 bg-info/[0.04] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 shrink-0 text-info" />
                      {interpolate(t("summary.version_label"), { version: selected.version })}
                      {isTranslated && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {ENDONYM_SHORT[lang]}
                        </Badge>
                      )}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {interpolate(t("summary.generated_by"), {
                        timestamp: formatDateTime(selected.generated_at),
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {showTranslateButton && (
                      <Button variant="outline" size="sm" onClick={() => void triggerTranslation()}>
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("common.translate")}
                      </Button>
                    )}
                    {isTranslating && (
                      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t("common.translating")}
                      </span>
                    )}
                  </div>
                </div>

                {isFallback && (
                  <div className="mt-4 flex items-center gap-2 rounded-squircle-sm border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {t("common.translation_unavailable")}
                  </div>
                )}

                <div className="mt-4 rounded-squircle-sm border border-border/60 bg-background p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {displayContent}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
