"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, AlertCircle, Clock, Download, FileText, Loader2, RefreshCw } from "lucide-react";

import { AiContentCard } from "@/components/ai-content-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCaseResponses,
  regenerateInsights,
  getResponseCorrelations,
  promoteResponseRow,
  ApiError,
  API_URL,
} from "@/lib/api";
import { interpolate, useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import { ResponseCorrelationPanel } from "@/components/response-correlation-panel";
import type { ProviderResponseOut, ResponseCorrelationOut } from "@/lib/types";

export default function ResponsesPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t } = useLanguage();
  const { formatDate } = useFormatters();

  const [responses, setResponses] = useState<ProviderResponseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [correlations, setCorrelations] = useState<ResponseCorrelationOut[]>([]);
  const [loadingCorrelations, setLoadingCorrelations] = useState(false);

  useEffect(() => {
    if (caseId) void loadResponses();
  }, [caseId]);

  useEffect(() => {
    if (selectedResponseId) void loadCorrelations(selectedResponseId);
  }, [selectedResponseId]);

  async function loadResponses() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCaseResponses(caseId);
      setResponses(data);
      if (data.length > 0) setSelectedResponseId(data[0].id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("responses.load_error_msg"));
    } finally {
      setLoading(false);
    }
  }

  async function loadCorrelations(responseId: string) {
    setLoadingCorrelations(true);
    try {
      setCorrelations(await getResponseCorrelations(responseId));
    } catch (e) {
      console.error("Failed to load correlations", e);
    } finally {
      setLoadingCorrelations(false);
    }
  }

  async function handleRegenerateInsights() {
    if (!selectedResponseId) return;
    setRegenerating(true);
    try {
      const updated = await regenerateInsights(selectedResponseId);
      setResponses((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("responses.load_error_msg"));
    } finally {
      setRegenerating(false);
    }
  }

  async function handlePromoteRow(rowIndex: number) {
    if (!selectedResponseId) return;
    await promoteResponseRow(selectedResponseId, rowIndex);
    await loadCorrelations(selectedResponseId);
  }

  const selectedResponse = responses.find((r) => r.id === selectedResponseId);

  if (loading) {
    return (
      <div className="grid animate-fade-up gap-6 lg:grid-cols-12">
        <Skeleton className="h-48 rounded-squircle lg:col-span-4" />
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Skeleton className="h-40 rounded-squircle" />
          <Skeleton className="h-72 rounded-squircle" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={AlertCircle}
          title={t("responses.load_error")}
          description={error}
          action={{ label: t("common.retry"), onClick: loadResponses }}
        />
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={Activity}
          title={t("responses.no_responses")}
          description={t("responses.no_responses_sub")}
        />
      </div>
    );
  }

  return (
    <div className="grid animate-fade-up grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Response rail */}
      <div className="flex flex-col gap-3 lg:col-span-4">
        <h3 className="flex items-center gap-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          {t("responses.title")}
          <Badge variant="secondary" className="ml-auto font-mono text-xs">
            {responses.length}
          </Badge>
        </h3>
        <ul className="flex flex-col gap-2">
          {responses.map((res, index) => {
            const isSelected = res.id === selectedResponseId;
            return (
              <li key={res.id}>
                <button
                  type="button"
                  onClick={() => setSelectedResponseId(res.id)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`flex w-full flex-col gap-1.5 rounded-squircle-sm border p-3 text-left transition-colors duration-200 ${
                    isSelected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-card hover:border-border/60"
                  }`}
                >
                  <span className="font-heading text-sm font-semibold text-foreground">
                    {interpolate(t("responses.response_label"), { index: index + 1 })}
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {t("responses.file_label")}: {res.file_path?.split("/").pop()}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(res.received_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        {selectedResponse && (
          <>
            {/* AI insight in canonical AiContentCard */}
            <AiContentCard
              title={t("responses.subtitle")}
              subtitle={t("responses.subtitle_desc")}
              headerRight={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateInsights}
                  disabled={regenerating}
                  loading={regenerating}
                >
                  {!regenerating && <RefreshCw className="h-3.5 w-3.5" />}
                  {t("common.regenerate")}
                </Button>
              }
            >
              <div className="max-w-[70ch] text-sm leading-relaxed text-foreground">
                <TranslatedTextBlock content={selectedResponse.ai_insights} />
              </div>
            </AiContentCard>

            <Card>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle className="text-base">{t("responses.parsed_records")}</CardTitle>
                  <CardDescription>{t("responses.parsed_records_desc")}</CardDescription>
                </div>
                {selectedResponse.file_path && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`${API_URL}/${selectedResponse.file_path}`}
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t("responses.download")}
                    </a>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingCorrelations ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 font-mono text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t("responses.running_correlation")}
                  </div>
                ) : (
                  <ResponseCorrelationPanel
                    correlations={correlations}
                    onPromote={handlePromoteRow}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
