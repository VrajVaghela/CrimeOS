"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Crosshair, Gavel, Scale, Sparkles, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PathStepper } from "@/components/path-stepper";
import { AiContentCard } from "@/components/ai-content-card";
import { getCasePath, generateCasePath, updateStepStatus, updateSectionStatus, getPathRevisions, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import type { CaseSectionOut, InvestigationPathOut, StepStatus } from "@/lib/types";
import { PathRevisionList } from "@/components/path-revision-list";

export default function PathPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"processing" | "done" | "failed" | "not_started">("not_started");
  const [message, setMessage] = useState("");
  const [path, setPath] = useState<InvestigationPathOut | null>(null);
  const [revisions, setRevisions] = useState<InvestigationPathOut[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
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
      if (res.status === "done" && res.path) {
        setSelectedRevisionId((prev) => prev || res.path?.id || null);
        const revs = await getPathRevisions(caseId);
        setRevisions(revs);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load path status");
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      void pollStatus();
    }, 2000);
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
        if (res.path) {
          setSelectedRevisionId(res.path.id);
          const revs = await getPathRevisions(caseId);
          setRevisions(revs);
        }
        stopPolling();
      } else if (res.status === "failed") {
        stopPolling();
      }
    } catch (e) {
      console.error("Error polling path status:", e);
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

  const { user } = useAuth();
  const [updatingSectionId, setUpdatingSectionId] = useState<string | null>(null);

  const handleStatusChange = async (stepId: string, newStatus: StepStatus) => {
    const currentPath = revisions.find((r) => r.id === selectedRevisionId) || path;
    if (!currentPath) return;
    try {
      const updatedStep = await updateStepStatus(stepId, newStatus);
      if (path && path.id === currentPath.id) {
        setPath({
          ...path,
          steps: path.steps.map((s) => (s.id === stepId ? updatedStep : s)),
        });
      }
      setRevisions((prev) =>
        prev.map((rev) => {
          if (rev.id === currentPath.id) {
            return {
              ...rev,
              steps: rev.steps.map((s) => (s.id === stepId ? updatedStep : s)),
            };
          }
          return rev;
        })
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update step status");
    }
  };

  const handleSectionStatusChange = async (sectionId: string, newStatus: string) => {
    setUpdatingSectionId(sectionId);
    try {
      const updated = await updateSectionStatus(sectionId, newStatus);
      setCaseSections((prev) => prev.map((s) => (s.id === sectionId ? updated : s)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to review legal section");
    } finally {
      setUpdatingSectionId(null);
    }
  };

  if (loading && status === "not_started") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Not Started
  if (status === "not_started") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl bg-card border border-violet/20 p-12 text-center animate-fade-up relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet via-primary to-violet/30" />
        <div className="rounded-full bg-gradient-to-br from-violet/20 to-primary/20 p-4 border border-violet/20">
          <Crosshair className="h-8 w-8 text-violet" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="font-heading text-xl font-bold text-foreground">
            {t("path.title")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("path.subtitle")}
          </p>
        </div>
        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={handleGenerate} size="lg" id="btn-generate-path">
          {t("path.analyze_btn")}
        </Button>
      </div>
    );
  }

  // Processing
  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-xl bg-card border border-violet/20 p-12 text-center animate-fade-up relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet via-info to-violet/30" />
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-violet/30 border-t-violet animate-spin" />
          <Sparkles className="absolute h-6 w-6 text-violet animate-pulse" />
        </div>
        <div className="max-w-md space-y-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {t("path.generating")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("path.generating_sub")}
          </p>
          <p className="font-mono text-xs text-accent-strong mt-2">
            {t("common.elapsed")}: {elapsedTime}s
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2 mt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6 mx-auto" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  // Failed
  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-xl bg-card border border-destructive/20 p-12 text-center animate-fade-up">
        <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="max-w-md space-y-1">
          <h2 className="font-heading text-lg font-bold text-destructive">
            {t("path.failed")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {message || "An unexpected error occurred during path suggestion."}
          </p>
        </div>
        <Button onClick={handleGenerate} variant="secondary" id="btn-retry-path">
          <RefreshCw className="h-4 w-4" />
          {t("path.regenerate")}
        </Button>
      </div>
    );
  }

  // Complete/Done
  const currentPath = revisions.find((r) => r.id === selectedRevisionId) || path;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-up">
      {/* Steps panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b border-violet/30 pb-4">
          <div>
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <div className="rounded-lg bg-violet/15 p-1.5">
                <Crosshair className="h-5 w-5 text-violet" />
              </div>
              {t("path.blueprint")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Model: <span className="font-mono text-accent-strong">{currentPath?.model_used || path?.model_used}</span> · Grounded in seeded police SOPs
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            id="btn-regenerate"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("path.regenerate")}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {currentPath && (
          <PathStepper steps={currentPath.steps} caseId={caseId} onStatusChange={handleStatusChange} />
        )}
      </div>

      {/* Legal Sections Sidebar */}
      <div className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pr-1 pb-6">
        {/* Revision History */}
        {revisions.length > 0 && (
          <div className="border border-border/60 bg-card rounded-xl p-4 space-y-3">
            <PathRevisionList
              revisions={revisions}
              activeRevisionId={path?.id || null}
              selectedRevisionId={selectedRevisionId}
              onSelectRevision={(rev) => setSelectedRevisionId(rev.id)}
            />
          </div>
        )}

        <div className="border-b border-violet/30 pb-4">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <div className="rounded-lg bg-violet/15 p-1.5">
              <Scale className="h-5 w-5 text-violet" />
            </div>
            {t("path.legal_grounding")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("path.legal_grounding_sub")}
          </p>
        </div>

        <div className="space-y-4">
          {caseSections.length === 0 ? (
            <div className="text-center p-8 bg-muted/30 rounded-xl border border-dashed border-border/40">
              <p className="text-sm text-muted-foreground">{t("path.no_sections")}</p>
            </div>
          ) : (
            caseSections.map((sec) => {
              const highConfidence = sec.confidence >= 0.85;
              return (
                <AiContentCard key={sec.id} title="AI-Suggested Section">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-heading font-semibold text-sm text-foreground block">
                          {sec.legal_section.code} Section {sec.legal_section.section_number}
                        </span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {sec.legal_section.title}
                        </span>
                      </div>
                      <Badge
                        variant={highConfidence ? "success" : "warning"}
                        className="text-[10px] font-mono font-semibold uppercase shrink-0"
                      >
                        {Math.round(sec.confidence * 100)}% Conf
                      </Badge>
                    </div>

                    {/* Section code text */}
                    <div className="rounded-lg bg-muted p-3 text-[11px] font-mono leading-relaxed text-muted-foreground border border-border/60 max-h-24 overflow-y-auto scrollbar-none">
                      {sec.legal_section.text}
                    </div>

                    {/* AI Reasoning */}
                    <div className="text-xs text-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
                      <span className="font-bold text-[10px] text-accent-strong block uppercase tracking-wider mb-1">
                        {t("path.ai_reasoning")}
                      </span>
                      <TranslatedTextBlock content={sec.ai_reasoning} autoTranslate={true} />
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between border-t border-border/30 pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                        {t("path.review_status")}
                      </span>
                      {sec.status === "approved" && (
                        <Badge variant="success">Verified Charge</Badge>
                      )}
                      {sec.status === "rejected" && (
                        <Badge variant="destructive">Flagged / Inapplicable</Badge>
                      )}
                      {sec.status === "pending" && (
                        <Badge variant="warning" dot pulse>Awaiting Audit</Badge>
                      )}
                    </div>

                    {/* Legal Advisor Actions */}
                    {user?.role === "LEGAL" && (
                      <div className="flex items-center gap-2 border-t border-border/30 pt-3 w-full justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingSectionId === sec.id}
                          onClick={() => void handleSectionStatusChange(sec.id, "rejected")}
                          className="text-xs h-7 px-2.5 text-destructive hover:bg-destructive/10"
                        >
                          {t("path.flag")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={updatingSectionId === sec.id}
                          onClick={() => void handleSectionStatusChange(sec.id, "approved")}
                          loading={updatingSectionId === sec.id}
                          variant="success"
                          className="text-xs h-7 px-2.5"
                        >
                          {updatingSectionId !== sec.id && <CheckCircle2 className="h-3 w-3" />}
                          {t("path.verify")}
                        </Button>
                      </div>
                    )}
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
