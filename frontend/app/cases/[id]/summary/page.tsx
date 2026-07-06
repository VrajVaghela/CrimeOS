"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Radar,
  Sparkles,
  RefreshCw,
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
import type { CaseSummaryOut } from "@/lib/types";

export default function SummaryPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [summaries, setSummaries] = useState<CaseSummaryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      void loadSummaries();
    }
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

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            Case Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated case summaries with full version history
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2 glow-primary"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate New Summary
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading summaries...</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border p-16 text-center grid-bg">
          <div className="rounded-full bg-primary/10 p-4">
            <Radar className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">No Summary Generated Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Click{" "}
              <span className="text-primary font-medium">Generate New Summary</span> to create an
              AI-powered case summary with full citation and audit trail.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Version selector sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              Version History
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {summaries.length}
              </Badge>
            </h3>
            <div className="flex flex-col gap-2">
              {summaries.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={[
                      "w-full text-left rounded-xl p-4 border transition-all text-xs font-mono flex flex-col gap-1.5",
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground glow-primary"
                        : "bg-card/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Version {s.version}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(s.generated_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary content panel */}
          <div className="lg:col-span-3">
            {selected && (
              <Card className="glass border-primary/30 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="font-heading text-base font-bold flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        AI Case Summary — Version {selected.version}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-1">
                        Generated by Gemini at{" "}
                        {new Date(selected.generated_at).toLocaleString("en-IN", {
                          dateStyle: "long",
                          timeStyle: "short",
                        })}
                      </CardDescription>
                    </div>
                    <Badge className="font-mono text-xs bg-primary/20 text-primary border border-primary/30 rounded-full">
                      v{selected.version}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                    <pre className="text-sm leading-relaxed text-foreground font-sans whitespace-pre-wrap">
                      {selected.content}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
