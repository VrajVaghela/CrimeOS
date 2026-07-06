"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Crosshair, Gavel, Scale, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PathStepper } from "@/components/path-stepper";
import { AiContentCard } from "@/components/ai-content-card";
import { getCasePath, generateCasePath, updateStepStatus, ApiError } from "@/lib/api";
import type { CaseSectionOut, InvestigationPathOut, StepStatus } from "@/lib/types";

export default function PathPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"processing" | "done" | "failed" | "not_started">("not_started");
  const [message, setMessage] = useState("");
  const [path, setPath] = useState<InvestigationPathOut | null>(null);
  const [caseSections, setCaseSections] = useState<CaseSectionOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    void loadPathStatus();
    return () => {
      stopPolling();
    };
  }, [caseId]);

  // Monitor processing status to manage intervals
  useEffect(() => {
    if (status === "processing") {
      startPolling();
    } else {
      stopPolling();
    }
  }, [status]);

  async function loadPathStatus() {
    try {
      setError(null);
      const res = await getCasePath(caseId);
      setStatus(res.status);
      setMessage(res.message);
      setPath(res.path);
      setCaseSections(res.case_sections);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load path status");
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    stopPolling(); // clear any existing

    // 1. Fetch status every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      void pollStatus();
    }, 2000);

    // 2. Increment elapsed time timer every second
    setElapsedTime(0);
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }

  async function pollStatus() {
    try {
      const res = await getCasePath(caseId);
      setStatus(res.status);
      setMessage(res.message);
      if (res.status === "done") {
        setPath(res.path);
        setCaseSections(res.case_sections);
        stopPolling();
      } else if (res.status === "failed") {
        stopPolling();
      }
    } catch (e) {
      console.error("Error polling path status:", e);
      // We don't abort on one error, just log and keep polling
    }
  }

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await generateCasePath(caseId);
      setStatus(res.status);
      setMessage(res.message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to trigger path generation");
      setStatus("not_started");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (stepId: string, newStatus: StepStatus) => {
    if (!path) return;
    try {
      const updatedStep = await updateStepStatus(stepId, newStatus);
      // Update local state
      setPath({
        ...path,
        steps: path.steps.map((s) => (s.id === stepId ? updatedStep : s)),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update step status");
    }
  };

  if (loading && status === "not_started") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  // State 1: Awaiting trigger (Not Started)
  if (status === "not_started") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-xl bg-card border border-border p-16 text-center grid-bg">
        <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
          <Crosshair className="h-8 w-8 text-primary glow-primary" />
        </div>
        <div className="max-w-md">
          <h2 className="font-heading text-xl font-bold text-foreground">
            Generate Investigation Path
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Analyze the complaint materials using Crime OS RAG. System will automatically match
            Standard Operating Procedures (SOPs), suggest BNS/BNSS/BSA legal sections, and lay out the steps.
          </p>
        </div>
        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={handleGenerate}
          className="bg-primary text-primary-foreground font-semibold px-6 py-2 rounded-lg hover:scale-105 glow-primary transition-all duration-200"
          id="btn-generate-path"
        >
          Analyze & Generate Path
        </Button>
      </div>
    );
  }

  // State 2: Background processing
  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-xl bg-card border border-border p-16 text-center grid-bg">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <Sparkles className="absolute h-5 w-5 text-primary animate-pulse" />
        </div>
        <div className="max-w-md space-y-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Generating Case Intelligence...
          </h2>
          <p className="text-sm text-muted-foreground">
            Retrieving SOPs, analyzing entities, and aligning BNS sections.
          </p>
          <p className="font-mono text-xs text-primary mt-2">
            Elapsed time: {elapsedTime}s
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2 mt-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6 mx-auto" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  // State 3: Error/Failed
  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-xl bg-card border border-destructive/20 p-16 text-center grid-bg">
        <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive glow-destructive" />
        </div>
        <div className="max-w-md">
          <h2 className="font-heading text-lg font-bold text-destructive">
            Generation Failed
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {message || "An unexpected error occurred during path suggestion."}
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          variant="secondary"
          className="border border-primary/60 text-foreground hover:bg-primary/10 font-semibold px-6 py-2 rounded-lg"
          id="btn-retry-path"
        >
          Regenerate Path
        </Button>
      </div>
    );
  }

  // State 4: Complete/Done
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Steps panel (Left 2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b pb-4 mb-2 border-border/40">
          <div>
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" />
              Investigation Blueprint
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Model: <span className="font-mono text-primary">{path?.model_used}</span> · Grounded in seeded police SOPs
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            className="border border-primary/40 text-xs font-semibold px-3 h-8 rounded hover:bg-primary/10"
            id="btn-regenerate"
          >
            Regenerate
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {path && (
          <PathStepper
            steps={path.steps}
            caseId={caseId}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Legal Sections Sidebar (Right 1 column) */}
      <div className="space-y-6">
        <div className="border-b pb-4 border-border/40">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Legal Grounding
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Statutory citations matching BNS / BNSS / BSA
          </p>
        </div>

        <div className="space-y-4">
          {caseSections.length === 0 ? (
            <div className="text-center p-8 bg-muted rounded-xl border border-dashed border-border text-muted-foreground">
              <p className="text-sm">No legal sections suggested for this crime classification.</p>
            </div>
          ) : (
            caseSections.map((sec) => {
              const highConfidence = sec.confidence >= 0.85;
              return (
                <AiContentCard key={sec.id} title="AI-Suggested Section">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-heading font-semibold text-sm text-foreground block">
                          {sec.legal_section.code} Section {sec.legal_section.section_number}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {sec.legal_section.title}
                        </span>
                      </div>
                      <Badge
                        className={[
                          "text-[10px] font-mono font-semibold uppercase tracking-wider rounded px-1.5 py-0.5",
                          highConfidence
                            ? "bg-success/15 text-success border border-success/30"
                            : "bg-accent/15 text-accent border border-accent/30",
                        ].join(" ")}
                        variant="outline"
                      >
                        {Math.round(sec.confidence * 100)}% Conf
                      </Badge>
                    </div>

                    {/* Section raw code text */}
                    <div className="rounded bg-muted p-3 text-[11px] font-mono leading-relaxed text-muted-foreground border border-border max-h-24 overflow-y-auto scrollbar-none">
                      {sec.legal_section.text}
                    </div>

                    {/* AI Reasoning explanation */}
                    <div className="text-xs text-foreground bg-primary/5 p-2.5 rounded border border-primary/10">
                      <span className="font-bold text-[10px] text-primary block uppercase tracking-wider mb-1">
                        Application Reasoning
                      </span>
                      {sec.ai_reasoning}
                    </div>
                  </div>
                </AiContentCard>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
