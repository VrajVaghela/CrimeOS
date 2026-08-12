"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  AlertCircle,
  Loader2,
  Sparkles,
  Tag,
  ShieldAlert,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  FileVideo,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Activity,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getVideoReport, pollVideoStatus } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import type { EvidenceOut, VideoReportResponse, VideoTimelineEntry } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface VideoEvidenceWorkspaceProps {
  evidence: EvidenceOut;
  onRefresh: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  UPLOADED: "Video file received, preparing analyzer...",
  PROCESSING: "Extracting video duration and metadata...",
  ACTIVE_ANALYSIS: "AI is reviewing video feed...",
  ANALYZING: "Generating incident report...",
  PERSISTING: "Saving timeline database records...",
  CLEANING_UP: "Finalizing tamper-evident audit logs...",
  COMPLETED: "Analysis complete!",
  FAILED: "Analysis failed",
};

export function VideoEvidenceWorkspace({ evidence, onRefresh }: VideoEvidenceWorkspaceProps) {
  const { t } = useLanguage();
  const [report, setReport] = useState<VideoReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  // Sync play/pause button state with HTML5 controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
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
      <div className="flex flex-col items-center justify-center min-h-[400px] py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("video.retrieving_report")}</p>
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
    const label = PHASE_LABELS[status] || "Processing video...";

    const steps = [
      {
        id: "ingest",
        label: "Video Validation & Gemini Ingestion",
        detail: "Stream verified & encrypted for AI multimodal review",
        icon: Cpu,
        activeAt: 0,
        doneAt: 25,
      },
      {
        id: "cv",
        label: "Computer Vision & Object Tracking",
        detail: "Scanning frames for threat signatures & timestamp anchors",
        icon: Sparkles,
        activeAt: 25,
        doneAt: 60,
      },
      {
        id: "legal",
        label: "BNS / BNSS Criminal Statute Mapping",
        detail: "Cross-referencing legal codes and drafting SOP report",
        icon: FileText,
        activeAt: 60,
        doneAt: 85,
      },
      {
        id: "ledger",
        label: "Tamper-Evident Ledger Commit",
        detail: "Hashing audit trail to immutable blockchain record",
        icon: ShieldCheck,
        activeAt: 85,
        doneAt: 100,
      },
    ];

    return (
      <Card className="max-w-2xl mx-auto my-8 border-info/30 bg-info/[0.04] rounded-squircle p-6 md:p-8 space-y-6">
        {/* Top Header Badge Row */}
        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-squircle-sm bg-info/10 border border-info/20 text-info">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <Badge
              variant="secondary"
              className="bg-info/10 text-info border-info/20 text-[11px] font-mono font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-squircle-sm"
            >
              AI Forensic Engine
            </Badge>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-mono text-info bg-info/10 border border-info/25 px-3 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
            </span>
            <span className="uppercase tracking-wider text-[11px] font-semibold">
              {status}
            </span>
          </div>
        </div>

        {/* Title & Current Phase */}
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground tracking-tight flex items-center justify-between">
            <span>{t("video.analyzer_title")}</span>
            <span className="text-xs font-mono text-muted-foreground font-normal">
              ID: {evidence.id.slice(0, 8)}
            </span>
          </h2>
          <p className="text-xs font-mono text-info flex items-center gap-2 pt-0.5">
            <Activity className="h-3.5 w-3.5 text-info animate-pulse shrink-0" />
            <span>{label}</span>
          </p>
        </div>

        {/* High-Precision Progress Meter */}
        <div className="space-y-2 bg-border-soft/50 p-4 rounded-squircle border border-border/40">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary font-medium uppercase tracking-wider text-[11px]">
              {t("video.analysis_progress")}
            </span>
            <span className="font-mono font-bold text-info text-sm bg-info/10 border border-info/20 px-2.5 py-0.5 rounded-squircle-sm">
              {progress}%
            </span>
          </div>

          <div className="w-full bg-background rounded-full h-2.5 p-0.5 border border-border/60 relative overflow-hidden">
            <div
              className="bg-info h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live Step Checklist Matrix */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-0.5">
            Live Telemetry Pipeline
          </p>
          <div className="grid grid-cols-1 gap-2">
            {steps.map((step) => {
              const isDone = progress >= step.doneAt;
              const isActive = progress >= step.activeAt && !isDone;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-squircle border text-xs transition-all duration-300 flex items-center justify-between gap-3 ${ isDone
                      ? "bg-success/[0.04] border-success/30 text-foreground"
                      : isActive
                      ? "bg-info/[0.08] border-info/40 text-foreground"
                      : "bg-border-soft/30 border-border/20 text-muted-foreground opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-squircle-sm shrink-0 border ${ isDone
                          ? "bg-success/15 border-success/30 text-success"
                          : isActive
                          ? "bg-info/15 border-info/30 text-info"
                          : "bg-muted/10 border-border/20 text-muted-foreground"
                      }`}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-medium truncate text-foreground text-xs">
                        {step.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                        {step.detail}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 font-mono text-[10px]">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-success font-semibold bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" /> DONE
                      </span>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1 text-info font-semibold bg-info/10 border border-info/20 px-2 py-0.5 rounded">
                        <Loader2 className="h-3 w-3 animate-spin" /> RUNNING
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 px-2 py-0.5">
                        QUEUED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Immutable Audit & Auto-Refresh Footer */}
        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border/30">
          <div className="flex items-center gap-1.5 text-secondary">
            <Lock className="h-3.5 w-3.5 text-info shrink-0" />
            <span>Tamper-evident blockchain ledger active</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Auto-refreshing</span>
          </div>
        </div>
      </Card>
    );
  }

  // State: Analysis Completed (Show Split screen player and report)
  if (!report) return null;
  const riskColors = getRiskColors(report.risk_evaluation);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-up">
      {/* LEFT COLUMN: Player (60% width on large screens) */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="overflow-hidden border-border/60 bg-background">
          <div className="relative aspect-video bg-background flex items-center justify-center group">
            <video
              ref={videoRef}
              src={`${API_URL}/${evidence.file_path}`}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <CardContent className="p-4 space-y-3 bg-card/40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate text-info flex items-center gap-1.5">
                  <FileVideo className="h-4.5 w-4.5 text-info shrink-0" />
                  {report.filename}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[320px]">
                  ID: {report.case_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-mono">
                  ⏱️ {report.duration_seconds ? `${Math.floor(report.duration_seconds / 60)}:${String(Math.floor(report.duration_seconds % 60)).padStart(2, "0")}` : "N/A"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  📦 {(report.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                </Badge>
              </div>
            </div>
            <Separator className="bg-border/30" />
            <div className="flex items-center justify-between gap-4 bg-black/40 p-2.5 rounded-squircle border border-border/40 text-xs">
              <span className="font-mono text-muted-foreground select-none">SHA-256 Hash:</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono truncate max-w-[200px] text-foreground/80">{report.original_sha256}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={copyChecksum}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Report & Timeline (40% width on large screens) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Overview card */}
        <Card className="border-border/60 bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 bg-surface-alt/40 border-b border-border/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-info">
                <Sparkles className="h-4.5 w-4.5" />
                <span className="font-heading text-xs font-bold uppercase tracking-wider">{t("video.forensic_report")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[10px] font-bold py-0.5 px-2 border ${riskColors.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${riskColors.dot}`} />
                  {report.risk_evaluation} RISK
                </Badge>
                <Badge className={`text-[10px] font-bold py-0.5 px-2 border ${report.chain_valid ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
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
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-squircle animate-pulse">
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
        <Card className="border-border/60 bg-card flex flex-col h-[380px] overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4 bg-surface-alt/40 border-b border-border/40 shrink-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-info" />
              Incident Timeline ({report.timeline.length} logs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1" ref={timelineRef}>
            {report.timeline.map((entry, index) => {
              const isActive = index === activeRowIndex;
              const entryRisk = getRiskColors(entry.risk_level);

              return (
                <div
                  key={`${entry.sequence_order}-${entry.timestamp_seconds}`}
                  data-timeline-row
                  onClick={() => handleRowClick(entry, index)}
                  className={`px-4 py-3 border-b border-border/30 cursor-pointer transition-all duration-200 ${ isActive
                      ? "bg-info/10 border-l-2 border-l-info"
                      : "hover:bg-surface-alt/20 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className={`font-mono text-xs font-bold ${isActive ? "text-info" : "text-foreground"}`}>
                      ⏱️ {entry.timestamp_in_video}
                    </span>
                    <Badge className={`text-[10px] uppercase font-mono px-1.5 ${entryRisk.bg}`}>
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
                        <Badge key={entIdx} variant="secondary" className="text-[10px] font-mono text-[10px] py-0 px-1 border border-border/50 uppercase">
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
