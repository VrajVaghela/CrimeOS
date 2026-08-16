"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Lock,
  Unlock,
  FileVideo,
  HardDrive,
  Clock,
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  Activity,
  FileText,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { getVideoReport, pollVideoStatus } from "@/lib/api";
import { useLanguage, type TranslationKey } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { EvidenceOut, VideoReportResponse, VideoTimelineEntry } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface VideoEvidenceWorkspaceProps {
  evidence: EvidenceOut;
  onRefresh: () => void;
}

/**
 * Live phase captions, keyed by the `video_status` values the backend actually
 * writes in `video_service.analyze_video_task`: UPLOADED → PROCESSING →
 * ACTIVE_ANALYSIS → COMPLETED | FAILED. An earlier version of this map also
 * carried ANALYZING, PERSISTING and CLEANING_UP, which no code path ever emits.
 * Anything unrecognized falls back to `phase_unknown` rather than going blank.
 */
const PHASE_CAPTION_KEYS: Record<string, TranslationKey> = {
  UPLOADED: "video.phase_uploaded",
  PROCESSING: "video.phase_processing",
  ACTIVE_ANALYSIS: "video.phase_active_analysis",
  COMPLETED: "video.phase_completed",
  FAILED: "video.phase_failed",
};

/**
 * Telemetry rows, anchored to the real `progress_percentage` checkpoints the
 * background task commits (0 → 15 → 35 → 55 → 60 → 75 → 100). Each row owns the
 * band that ends at its `doneAt`, so exactly one row can be running and it is
 * always the work the phase caption is describing. Thresholds invented
 * independently of the backend put the RUNNING chip on the wrong row.
 */
const PIPELINE_STEPS: ReadonlyArray<{
  id: string;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  icon: LucideIcon;
  doneAt: number;
}> = [
  // Duration and metadata read, ledger ANALYSIS_STARTED appended.
  { id: "ingest", labelKey: "video.step_ingest", detailKey: "video.step_ingest_detail", icon: Cpu, doneAt: 15 },
  // Gemini upload, then wait_for_file until the stream is ACTIVE.
  { id: "cv", labelKey: "video.step_cv", detailKey: "video.step_cv_detail", icon: Sparkles, doneAt: 55 },
  // The forensic analysis call: frame review and statute mapping in one pass.
  { id: "legal", labelKey: "video.step_legal", detailKey: "video.step_legal_detail", icon: FileText, doneAt: 75 },
  // Markers and timeline events persisted, report sealed.
  { id: "ledger", labelKey: "video.step_ledger", detailKey: "video.step_ledger_detail", icon: ShieldCheck, doneAt: 100 },
];

export function VideoEvidenceWorkspace({ evidence, onRefresh }: VideoEvidenceWorkspaceProps) {
  const { t } = useLanguage();
  const [report, setReport] = useState<VideoReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);

  // Polling states for active analysis progress
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("UPLOADED");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Track if video status is active (still processing)
  const initialStatus = evidence.ai_tags?.video_status || "UPLOADED";
  const isStillProcessing = initialStatus !== "COMPLETED" && initialStatus !== "FAILED";

  // 1. Polling Effect (only if evidence is not completed/failed yet)
  useEffect(() => {
    if (!isStillProcessing) return;

    setStatus(initialStatus);
    setProgress(evidence.ai_tags?.progress_percentage || 0);

    const interval = setInterval(async () => {
      try {
        const res = await pollVideoStatus(evidence.id);
        setStatus(res.video_case_status || "UPLOADED");
        setProgress(res.progress_percentage);
        setErrorDetail(res.error_detail);

        if (res.video_case_status === "COMPLETED") {
          clearInterval(interval);
          onRefresh(); // trigger page refresh to load final completed state
        } else if (res.video_case_status === "FAILED") {
          clearInterval(interval);
          onRefresh();
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [evidence.id, isStillProcessing, initialStatus, onRefresh]);

  // 2. Fetch Report Effect (only if evidence is completed)
  useEffect(() => {
    if (isStillProcessing) {
      setLoading(false);
      return;
    }

    if (initialStatus === "FAILED") {
      setError(evidence.ai_tags?.error_detail || "Forensic analysis failed.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getVideoReport(evidence.id);
        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [evidence.id, initialStatus, isStillProcessing, evidence.ai_tags?.error_detail]);

  // 3. Highlight current timeline item during video playback
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !report) return;

    const currentTime = videoRef.current.currentTime;
    const timeline = report.timeline;

    let closestIndex = -1;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].timestamp_seconds <= currentTime) {
        closestIndex = i;
        break;
      }
    }

    if (closestIndex !== activeRowIndex) {
      setActiveRowIndex(closestIndex);

      // Auto-scroll the active row into view
      if (closestIndex >= 0 && timelineRef.current) {
        const rows = timelineRef.current.querySelectorAll("[data-timeline-row]");
        if (rows[closestIndex]) {
          rows[closestIndex].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }
  }, [report, activeRowIndex]);

  // Keep the timeline highlight in step with playback. The native <video>
  // controls own play/pause, so there is nothing else to mirror here.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [handleTimeUpdate]);

  // 4. Click-to-Seek Handler
  const handleRowClick = useCallback((entry: VideoTimelineEntry, index: number) => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = entry.timestamp_seconds;
    setActiveRowIndex(index);

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const copyChecksum = () => {
    if (!report?.original_sha256) return;
    navigator.clipboard.writeText(report.original_sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColors = (level: string | null) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return {
          bg: "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/25",
          dot: "bg-destructive glow-destructive",
        };
      case "MEDIUM":
        return {
          bg: "bg-warn/10 border-warn/20 text-warn hover:bg-warn/25",
          dot: "bg-warn glow-warning",
        };
      default:
        return {
          bg: "bg-success/10 border-success/20 text-success hover:bg-success/25",
          dot: "bg-success glow-success",
        };
    }
  };

  // State: Loading report
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-[420px] w-full" />
          <Skeleton className="lg:col-span-5 h-[420px] w-full" />
        </div>
      </div>
    );
  }

  // State: Error
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            {t("video.analysis_failed")}
          </CardTitle>
          <CardDescription>
            {t("video.analysis_failed_sub")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/80 font-mono bg-black/40 p-3 rounded-squircle border border-border/40">
            {error}
          </p>
          <Button variant="outline" className="w-full" onClick={onRefresh}>
            {t("video.reload_workspace")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // State: Active background processing
  if (isStillProcessing) {
    const captionKey = PHASE_CAPTION_KEYS[status] ?? "video.phase_unknown";
    // The backend can only ever report 0–100, but a clamp keeps a bad payload
    // from painting a bar past its track or reading a negative aria value.
    const percent = Math.min(100, Math.max(0, Math.round(progress)));
    // The first row whose band has not closed yet. -1 once every band is done.
    const runningIndex = PIPELINE_STEPS.findIndex((step) => percent < step.doneAt);

    return (
      <Card className="animate-fade-up mx-auto mt-8 max-w-2xl border-info/30 bg-info/[0.04]">
        {/* Heading, live phase, and the analysis identifier */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border/40 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                {t("video.analyzer_title")}
              </h2>
            </div>
            {/* Polling swaps this caption without a reload, so it has to announce
                itself — otherwise a screen reader sees one frozen sentence. */}
            <p className="mt-1 flex items-start gap-2 text-sm text-info" aria-live="polite">
              <Activity className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(captionKey)}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
            <StatusBadge status={status} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("video.analysis_id")} {evidence.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* A soft failure the poll reported while the run is still going. Amber,
            not red: the pipeline has not given up, but the officer should know. */}
        {errorDetail && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-squircle-sm border border-warn/30 bg-warn/[0.06] p-3 text-xs text-secondary-foreground"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            <span>{errorDetail}</span>
          </div>
        )}

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
              {t("video.analysis_progress")}
            </span>
            <span className="rounded-sm border border-info/20 bg-info/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-info">
              {percent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t("video.analysis_progress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-info transition-[width] duration-[220ms] ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Telemetry pipeline */}
        <div className="mt-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("video.pipeline_title")}
          </p>
          <ol className="mt-2.5 space-y-2">
            {PIPELINE_STEPS.map((step, index) => {
              const isDone = runningIndex === -1 || index < runningIndex;
              const isRunning = index === runningIndex;
              const StepIcon = step.icon;

              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-squircle-sm border p-3 transition-colors duration-[130ms]",
                    isDone && "border-success/30 bg-success/[0.04]",
                    isRunning && "border-info/40 bg-info/[0.08]",
                    // A queued row is quieted by tone and its badge, never by
                    // opacity — dimmed body text below the muted floor is unreadable.
                    !isDone && !isRunning && "border-border/40 bg-surface-alt/40",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "shrink-0 rounded-squircle-sm border p-2",
                        isDone && "border-success/30 bg-success/15 text-success",
                        isRunning && "border-info/30 bg-info/15 text-info",
                        !isDone && !isRunning && "border-border/40 bg-muted text-muted-foreground",
                      )}
                    >
                      <StepIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {/* No truncation: Hindi and Gujarati run appreciably longer
                        than the English source, and a clipped step is a step the
                        officer cannot read. */}
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-medium text-foreground">
                        {t(step.labelKey)}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t(step.detailKey)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={isDone ? "done" : isRunning ? "running" : "queued"} />
                </li>
              );
            })}
          </ol>
        </div>

        {/* Custody and refresh assurances */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/40 pt-3.5 text-xs">
          <span className="flex items-center gap-1.5 text-secondary-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
            {t("video.ledger_active")}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t("video.auto_refreshing")}
          </span>
        </div>
      </Card>
    );
  }

  // State: Analysis Completed (Show Split screen player and report)
  if (!report) return null;
  const riskColors = getRiskColors(report.risk_evaluation);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fade-up">
      {/* LEFT COLUMN: Player (60% width on large screens) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <Card className="overflow-hidden border-border/60 bg-background flex-1 flex flex-col">
          <div className="relative aspect-video bg-background flex items-center justify-center group shrink-0">
            <video
              ref={videoRef}
              src={`${API_URL}/${evidence.file_path}`}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <CardContent className="p-4 space-y-3 bg-card/40 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate text-info flex items-center gap-1.5">
                  <FileVideo className="h-4 w-4 text-info shrink-0" />
                  {report.filename}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[320px]">
                  ID: {report.case_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-[10px] font-mono">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {report.duration_seconds ? `${Math.floor(report.duration_seconds / 60)}:${String(Math.floor(report.duration_seconds % 60)).padStart(2, "0")}` : "N/A"}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-[10px] font-mono">
                  <HardDrive className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {(report.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                </Badge>
              </div>
            </div>
            <details className="group rounded-squircle-sm border border-border/40 bg-surface-alt/40 transition-colors">
              <summary className="flex cursor-pointer items-center justify-between p-2.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-squircle-sm">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-info shrink-0" />
                  <span className="font-heading font-semibold uppercase tracking-wide text-[10px] text-foreground">
                    {t("video.chain_of_custody")} & SHA-256
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={report.chain_valid ? "success" : "destructive"}
                    className="text-[10px] font-mono py-0.5 px-2 rounded-squircle-sm"
                  >
                    {report.chain_valid ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                    {report.chain_valid ? "Chain Verified" : "Verification Failed"}
                  </Badge>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180 text-muted-foreground" />
                </div>
              </summary>
              <div className="border-t border-border/30 p-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3 bg-black/40 p-2.5 rounded-squircle-sm border border-border/40">
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{t("video.file_hash")}</span>
                    <span className="font-mono text-xs text-foreground/90 truncate select-all">{report.original_sha256}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={copyChecksum}
                    title="Copy SHA-256 Checksum"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Report & Timeline (40% width on large screens) */}
      <div className="lg:col-span-5 flex flex-col space-y-4 min-h-0">
        {/* Overview card */}
        <Card className="border-border/60 bg-card overflow-hidden shrink-0">
          <CardHeader className="pb-3 pt-4 px-4 bg-surface-alt/40 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-info">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="font-heading text-xs font-bold uppercase tracking-wider">{t("video.forensic_report")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[10px] font-bold py-0.5 px-2 border rounded-squircle-sm ${riskColors.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${riskColors.dot}`} />
                  {report.risk_evaluation} RISK
                </Badge>
                <Badge className={`text-[10px] font-bold py-0.5 px-2 border rounded-squircle-sm ${report.chain_valid ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                  {report.chain_valid ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                  {report.chain_valid ? "Chain Verified" : "Verification Failed"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <p className="text-xs text-foreground/90 leading-relaxed font-sans">
              {report.summary || "No summary available."}
            </p>

            {/* Crime Summary callout */}
            {report.crime_summary && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-squircle-sm">
                <div className="flex items-center gap-1.5 text-destructive text-xs font-bold uppercase">
                  <ShieldAlert className="h-4 w-4" />
                  {t("video.detected_incident")}
                </div>
                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
                  {report.crime_summary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline card */}
        <Card className="border-border/60 bg-card flex flex-col flex-1 min-h-[260px] overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4 bg-surface-alt/40 border-b border-border/40 shrink-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-info" />
              Incident Timeline ({report.timeline.length} logs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1 max-h-[360px] lg:max-h-none" ref={timelineRef}>
            {report.timeline.map((entry, index) => {
              const isActive = index === activeRowIndex;
              const entryRisk = getRiskColors(entry.risk_level);

              return (
                <div
                  key={`${entry.sequence_order}-${entry.timestamp_seconds}`}
                  data-timeline-row
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(entry, index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowClick(entry, index);
                    }
                  }}
                  className={`p-3.5 border-b border-border/30 cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                    isActive
                      ? "bg-info/[0.08] text-foreground border-border/60"
                      : "hover:bg-surface-alt/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className={`flex items-center gap-1.5 font-mono text-xs font-bold ${isActive ? "text-info" : "text-foreground"}`}>
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {entry.timestamp_in_video}
                    </span>
                    <Badge className={`text-[10px] uppercase font-mono px-1.5 rounded-squircle-sm ${entryRisk.bg}`}>
                      {entry.risk_level}
                    </Badge>
                  </div>
                  <p className={`text-xs leading-relaxed ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {entry.description}
                  </p>
                  
                  {/* Entities list if present */}
                  {entry.entities_detected && entry.entities_detected.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.entities_detected.map((ent, entIdx) => (
                        <Badge key={entIdx} variant="secondary" className="text-[10px] font-mono py-0 px-1 border border-border/50 uppercase rounded-squircle-sm">
                          {ent}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
