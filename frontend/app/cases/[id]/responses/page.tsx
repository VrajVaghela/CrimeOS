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
import { getCaseResponses, regenerateInsights, ApiError } from "@/lib/api";
import type { ProviderResponseOut } from "@/lib/types";

export default function ResponsesPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [responses, setResponses] = useState<ProviderResponseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (caseId) {
      void loadResponses();
    }
  }, [caseId]);

  async function loadResponses() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCaseResponses(caseId);
      setResponses(data);
      if (data.length > 0) {
        setSelectedResponseId(data[0].id);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load responses");
    } finally {
      setLoading(false);
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

  const selectedResponse = responses.find((r) => r.id === selectedResponseId);
  const records = selectedResponse?.parsed_data?.records || [];
  const recordHeaders = records.length > 0 ? Object.keys(records[0]) : [];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mt-12" />
          <p className="text-center text-sm text-muted-foreground">Loading provider responses...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="font-heading text-lg font-semibold text-destructive">Error Loading Data</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={loadResponses} variant="secondary" className="border-destructive/30 hover:bg-destructive/10">
            Retry
          </Button>
        </div>
      ) : responses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border p-16 text-center grid-bg">
          <div className="rounded-full bg-primary/10 p-4">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">No Provider Responses Received Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Dispatch a legal request to a telecom or bank, then click{" "}
              <span className="text-success font-medium">Trigger Mock Response</span> to simulate the provider sending back data.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar selector */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
              Response Files
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
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground glow-primary"
                        : "bg-card/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Response #{index + 1}
                    </div>
                    <div>File: {res.file_path?.split("/").pop()}</div>
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
                <Card className="glass border-primary/30 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="font-heading text-base font-bold flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        AI Analysis & Insights
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Gemini-generated insights and pattern correlation over provider raw records.
                      </CardDescription>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRegenerateInsights}
                      disabled={regenerating}
                      className="text-xs h-8 gap-1.5 border-border shrink-0"
                    >
                      {regenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Regenerate
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground bg-primary/5 border border-primary/20 rounded-lg p-4 font-sans whitespace-pre-wrap">
                      {selectedResponse.ai_insights}
                    </p>
                  </CardContent>
                </Card>

                {/* Parsed Data Table */}
                <Card className="border-border">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="font-heading text-base font-bold flex items-center gap-2">
                        <TableIcon className="h-4 w-4 text-primary" />
                        Parsed Response Records
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Tabular extraction of CSV data received from provider.
                      </CardDescription>
                    </div>
                    {selectedResponse.file_path && (
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="text-xs h-8 gap-1.5 border-border"
                      >
                        <a href={`http://localhost:8000/${selectedResponse.file_path}`} download target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5" />
                          Download CSV
                        </a>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {records.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No rows found in this response file.
                      </p>
                    ) : (
                      <div className="rounded-md border border-border/80 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              {recordHeaders.map((header) => (
                                <TableHead key={header} className="font-mono text-xs uppercase text-muted-foreground font-semibold">
                                  {header.replace("_", " ")}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {records.map((row, idx) => (
                              <TableRow
                                key={idx}
                                className={[
                                  "hover:bg-primary/5 font-mono text-xs",
                                  // Highlight suspicious IP or numbers with a subtle red bg (bonus wow design detail!)
                                  row.ip_address === "103.88.22.14" || row.calling_number === "+919876543210"
                                    ? "bg-destructive/10 border-l border-l-destructive"
                                    : "",
                                ].join(" ")}
                              >
                                {recordHeaders.map((header) => (
                                  <TableCell key={header} className="py-2.5">
                                    {String(row[header] ?? "")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
