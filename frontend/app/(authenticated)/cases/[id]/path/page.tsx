"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Crosshair, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
        <Skeleton className="h-64 w-full rounded-squircle" />
      </div>
    );
  }

  // Not Started
  if (status === "not_started") {
    return (
      <div className="animate-fade-up">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <EmptyState
          icon={Crosshair}
          title={t("path.title")}
          description={t("path.subtitle")}
          action={{ label: t("path.analyze_btn"), onClick: handleGenerate }}
        />
      </div>
    );
  }

  // Processing
  if (status === "processing") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex animate-fade-up flex-col items-center justify-center gap-5 rounded-squircle border border-info/30 bg-info/[0.04] p-12 text-center"
      >
        <Loader2 className="h-8 w-8 animate-spin text-info" />
        <div className="max-w-md space-y-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {t("path.generating")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("path.generating_sub")}
          </p>
          <p className="pt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {t("common.elapsed")}: {elapsedTime}s
          </p>
        </div>
        <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="mx-auto h-3 w-5/6 rounded-full" />
          <Skeleton className="mx-auto h-3 w-2/3 rounded-full" />
        </div>
      </div>
    );
  }

  // Failed
  if (status === "failed") {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={AlertCircle}
          title={t("path.failed")}
          description={message || t("path.failed_sub")}
          action={{ label: t("path.regenerate"), onClick: handleGenerate, icon: RefreshCw }}
        />
      </div>
    );
  }

  // Complete/Done
  const currentPath = revisions.find((r) => r.id === selectedRevisionId) || path;

  return (
    <div className="grid animate-fade-up grid-cols-1 items-start gap-6 lg:grid-cols-3">
      {/* Steps panel */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        <PageHeader
          level="section"
          title={t("path.blueprint")}
          description={
            <>
              {t("path.model_label")}{" "}
              <span className="font-mono text-foreground">
                {currentPath?.model_used || path?.model_used}
              </span>
              <span className="mx-1.5 text-muted-foreground/40">/</span>
              {t("path.grounded_in_sops")}
            </>
          }
          actions={
            <Button variant="outline" size="sm" onClick={handleGenerate} id="btn-regenerate">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("path.regenerate")}
            </Button>
          }
          className="border-b border-border pb-4"
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {currentPath && (
          <PathStepper
            steps={currentPath.steps}
            caseId={caseId}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Legal grounding rail. Sticky so an advisor can scroll the steps while
          keeping the sections they are auditing in view. */}
      <div className="flex flex-col gap-6 pb-6 pr-1 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        {revisions.length > 0 && (
          <div className="rounded-squircle border border-border/80 bg-card p-4">
            <PathRevisionList
              revisions={revisions}
              activeRevisionId={path?.id || null}
              selectedRevisionId={selectedRevisionId}
              onSelectRevision={(rev) => setSelectedRevisionId(rev.id)}
            />
          </div>
        )}

        <PageHeader
          level="section"
          title={t("path.legal_grounding")}
          description={t("path.legal_grounding_sub")}
          className="border-b border-border pb-4"
        />

        <div className="flex flex-col gap-4">
          {caseSections.length === 0 ? (
            <div className="rounded-squircle border border-dashed border-border bg-surface-alt/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">{t("path.no_sections")}</p>
            </div>
          ) : (
            caseSections.map((sec) => {
              const highConfidence = sec.confidence >= 0.85;
              return (
                <AiContentCard key={sec.id} title={t("common.ai_suggested_section")}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-mono text-sm font-semibold text-foreground">
                          {sec.legal_section.code} {sec.legal_section.section_number}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {sec.legal_section.title}
                        </span>
                      </div>
                      <Badge
                        variant={highConfidence ? "success" : "warning"}
                        className="shrink-0 font-mono text-[10px] font-semibold"
                      >
                        {Math.round(sec.confidence * 100)}% {t("path.conf_short")}
                      </Badge>
                    </div>

                    <div className="max-h-24 overflow-y-auto rounded-squircle-sm border border-border/60 bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {sec.legal_section.text}
                    </div>

                    <div className="rounded-squircle-sm border border-border/60 bg-background p-3">
                      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-info">
                        {t("path.ai_reasoning")}
                      </span>
                      <div className="text-xs leading-relaxed text-secondary-foreground">
                        <TranslatedTextBlock content={sec.ai_reasoning} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-info/20 pt-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        {t("path.review_status")}
                      </span>
                      {sec.status === "approved" && (
                        <Badge variant="success">{t("path.verified_charge")}</Badge>
                      )}
                      {sec.status === "rejected" && (
                        <Badge variant="destructive">{t("path.flagged_inapplicable")}</Badge>
                      )}
                      {sec.status === "pending" && (
                        <Badge variant="warning" dot pulse>
                          {t("path.awaiting_audit")}
                        </Badge>
                      )}
                    </div>

                    {user?.role === "LEGAL" && (
                      <div className="flex w-full items-center justify-end gap-2 border-t border-info/20 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingSectionId === sec.id}
                          onClick={() => void handleSectionStatusChange(sec.id, "rejected")}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          {t("path.flag")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={updatingSectionId === sec.id}
                          onClick={() => void handleSectionStatusChange(sec.id, "approved")}
                          loading={updatingSectionId === sec.id}
                          variant="success"
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
