"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  FileText,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  Loader2,
  RefreshCw,
  Table as TableIcon,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCaseResponses, regenerateInsights, getResponseCorrelations, promoteResponseRow, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import { ResponseCorrelationPanel } from "@/components/response-correlation-panel";
import type { ProviderResponseOut, ResponseCorrelationOut } from "@/lib/types";

export default function ResponsesPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t } = useLanguage();

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
    if (selectedResponseId) {
      void loadCorrelations(selectedResponseId);
    }
  }, [selectedResponseId]);

  async function loadResponses() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCaseResponses(caseId);
      setResponses(data);
      if (data.length > 0) setSelectedResponseId(data[0].id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load responses");
    } finally {
      setLoading(false);
    }
  }

  async function loadCorrelations(responseId: string) {
    setLoadingCorrelations(true);
    try {
      const data = await getResponseCorrelations(responseId);
      setCorrelations(data);
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
      setError(e instanceof ApiError ? e.message : "Failed to regenerate insights");
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
  const records = selectedResponse?.parsed_data?.records || [];
  const recordHeaders = records.length > 0 ? Object.keys(records[0]) : [];

  return (
    <div className="space-y-6 animate-fade-up">
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading provider responses...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center animate-fade-down">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="font-heading text-lg font-semibold text-destructive">Error Loading Data</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={loadResponses} variant="secondary">Retry</Button>
        </div>
      ) : responses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border/60 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-heading font-semibold text-lg">{t("responses.no_responses")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("responses.no_responses_sub")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar selector */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              {t("responses.title")}
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {responses.length}
              </Badge>
            </h3>
            <div className="flex flex-col gap-2">
              {responses.map((res, index) => {
                const isSelected = res.id === selectedResponseId;
                return (
                  <button
                    key={res.id}
                    onClick={() => setSelectedResponseId(res.id)}
                    className={[
                      "w-full text-left rounded-xl p-4 border transition-all text-xs font-mono flex flex-col gap-1.5",
                      "animate-fade-up",
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-card/50 border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    ].join(" ")}
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <div className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Response #{index + 1}
                    </div>
                    <div className="truncate">File: {res.file_path?.split("/").pop()}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(res.received_at).toLocaleDateString("en-IN")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Response View */}
          <div className="lg:col-span-3 space-y-6">
            {selectedResponse && (
              <>
                {/* AI Insights Card */}
                <Card className="relative overflow-hidden animate-fade-up border-info/30">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-info via-primary to-info/30" />
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="font-heading text-base font-bold flex items-center gap-2 text-info">
                        <div className="rounded-lg bg-info/15 p-1.5">
                          <Sparkles className="h-4 w-4 text-info" />
                        </div>
                        {t("responses.subtitle")}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {t("responses.subtitle_desc")}
                      </CardDescription>
                    </div>
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
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed text-foreground bg-primary/5 border border-primary/20 rounded-lg p-4 font-sans whitespace-pre-wrap">
                      <TranslatedTextBlock content={selectedResponse.ai_insights} />
                    </div>
                  </CardContent>
                </Card>

                {/* Parsed Data Table with AI Correlations */}
                <Card className="animate-fade-up delay-200">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="font-heading text-base font-bold flex items-center gap-2">
                        <TableIcon className="h-4 w-4 text-primary" />
                        {t("responses.parsed_records" as any) || "Response Correlations & Evidence Linker"}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {t("responses.parsed_records_desc" as any) || "Explains flagged records and links them to case entities and path steps. Promote rows to add to Case Diary."}
                      </CardDescription>
                    </div>
                    {selectedResponse.file_path && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`http://localhost:8000/${selectedResponse.file_path}`}
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
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-xs font-mono">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        Running correlation engine...
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
      )}
    </div>
  );
}
