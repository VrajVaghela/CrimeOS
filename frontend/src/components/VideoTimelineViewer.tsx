/**
 * VideoTimelineViewer — Split-Screen Investigation Dashboard
 * =============================================================
 * Implements the core investigation interface with:
 *
 *   Left Pane:
 *     - HTML5 <video> element (ref-controlled, no third-party player)
 *     - Plays the originally uploaded video via client-side object URL
 *     - Does NOT re-fetch from Gemini (deleted in Stage 2 Phase D)
 *
 *   Right Pane:
 *     - Summary card with executive summary, risk badge, and chain-of-custody indicator
 *     - Scrollable timeline of ChronologicalLog entries in sequence_order
 *     - Color-coded risk badges (green=LOW, orange=MEDIUM, red=HIGH)
 *
 *   Synchronization (CKPT-4.3):
 *     - Clicking a timeline row seeks the video to that timestamp_seconds
 *     - Video timeupdate event highlights the currently active timeline row
 *     - Uses backend-provided timestamp_seconds (not client-side re-parse)
 *
 * @module VideoTimelineViewer
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getReport, type ReportResponse, type TimelineEntry } from "../api/client";
import { tokens, getRiskColors } from "../design-tokens";

// ── Types ───────────────────────────────────────────────────────────────────
interface VideoTimelineViewerProps {
  /** UUID of the completed video case */
  caseId: string;
  /** Client-side blob URL of the uploaded video for playback */
  videoUrl: string;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function VideoTimelineViewer({
  caseId,
  videoUrl,
}: VideoTimelineViewerProps) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeRowIndex, setActiveRowIndex] = useState<number>(-1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // ── Fetch Report ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchReport() {
      try {
        const data = await getReport(caseId);
        if (!cancelled) {
          setReport(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load report"
          );
          setLoading(false);
        }
      }
    }

    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // ── Video Time Update Handler (CKPT-4.3) ─────────────────────────────
  // Listens to the video's timeupdate event and highlights the timeline row
  // whose timestamp_seconds is the closest preceding value.
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !report) return;

    const currentTime = videoRef.current.currentTime;
    const timeline = report.timeline;

    // Find the closest preceding timeline entry
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

  // ── Attach timeupdate listener ────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [handleTimeUpdate]);

  // ── Click-to-Seek Handler (CKPT-4.3) ─────────────────────────────────
  const handleRowClick = useCallback((entry: TimelineEntry, index: number) => {
    if (!videoRef.current) return;

    // Use backend-provided timestamp_seconds (not client-side re-parse)
    videoRef.current.currentTime = entry.timestamp_seconds;
    setActiveRowIndex(index);

    // Resume playback if paused
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked by browser
      });
    }
  }, []);

  // ── Loading State ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
          color: tokens.colors.textSecondary,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: `3px solid ${tokens.colors.borderAccent}`,
              borderTopColor: tokens.colors.cyan,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Loading report...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          color: tokens.colors.error,
        }}
      >
        {error || "Failed to load report"}
      </div>
    );
  }

  const riskColors = getRiskColors(report.risk_evaluation || "");

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 80px)",
        gap: "0",
        background: tokens.colors.bgPrimary,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          LEFT PANE — Video Player
          ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${tokens.colors.borderDefault}`,
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#000",
          }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANE — Summary + Timeline
          ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: "1 1 45%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxWidth: "500px",
        }}
      >
        {/* ── Summary Card ────────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px",
            borderBottom: `1px solid ${tokens.colors.borderDefault}`,
            background: tokens.colors.bgSecondary,
            flexShrink: 0,
          }}
        >
          {/* Risk Badge + Chain of Custody */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            {/* Overall Risk Badge */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: tokens.radius.full,
                background: riskColors.bg,
                color: riskColors.color,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                border: `1px solid ${riskColors.color}40`,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: riskColors.color,
                  boxShadow: `0 0 6px ${riskColors.color}`,
                }}
              />
              {report.risk_evaluation || "N/A"} RISK
            </span>

            {/* Chain of Custody Indicator */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: tokens.radius.full,
                background: report.chain_valid
                  ? tokens.colors.successBg
                  : tokens.colors.errorBg,
                color: report.chain_valid
                  ? tokens.colors.success
                  : tokens.colors.error,
                fontSize: "11px",
                fontWeight: 600,
                border: `1px solid ${
                  report.chain_valid ? tokens.colors.success : tokens.colors.error
                }40`,
              }}
            >
              {report.chain_valid ? "🔒" : "⚠️"}{" "}
              {report.chain_valid ? "Chain Intact" : "INTEGRITY FAILED"}
            </span>
          </div>

          <p
            style={{
              color: tokens.colors.textPrimary,
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            {report.summary || "No summary available."}
          </p>

          {/* Crime Summary */}
          {report.crime_summary && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: tokens.colors.errorBg,
                borderLeft: `4px solid ${tokens.colors.error}`,
                borderRadius: tokens.radius.sm,
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: tokens.colors.error, fontSize: "12px", textTransform: "uppercase" }}>
                🚨 Crime Summary
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: tokens.colors.textPrimary, lineHeight: "1.5" }}>
                {report.crime_summary}
              </p>
            </div>
          )}

          {/* File Info */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "12px",
              fontSize: "11px",
              color: tokens.colors.textMuted,
            }}
          >
            <span>📁 {report.filename}</span>
            <span>
              ⏱️{" "}
              {report.duration_seconds
                ? `${Math.floor(report.duration_seconds / 60)}:${String(
                    Math.floor(report.duration_seconds % 60)
                  ).padStart(2, "0")}`
                : "N/A"}
            </span>
            <span>
              📦{" "}
              {(report.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>

        {/* ── Timeline Header ────────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: `1px solid ${tokens.colors.borderDefault}`,
            background: tokens.colors.bgTertiary,
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 600,
              color: tokens.colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            📋 Incident Timeline ({report.timeline.length} events)
          </h3>
        </div>

        {/* ── Scrollable Timeline ────────────────────────────────────── */}
        <div
          ref={timelineRef}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {report.timeline.map((entry, index) => {
            const entryRisk = getRiskColors(entry.risk_level);
            const isActive = index === activeRowIndex;

            return (
              <div
                key={`${entry.sequence_order}-${entry.timestamp_seconds}`}
                data-timeline-row
                onClick={() => handleRowClick(entry, index)}
                style={{
                  padding: "14px 20px",
                  borderBottom: `1px solid ${tokens.colors.borderDefault}`,
                  cursor: "pointer",
                  background: isActive
                    ? `linear-gradient(90deg, ${tokens.colors.cyanGlow} 0%, transparent 100%)`
                    : "transparent",
                  borderLeft: isActive
                    ? `3px solid ${tokens.colors.cyan}`
                    : "3px solid transparent",
                  transition: `all ${tokens.transitions.fast}`,
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = tokens.colors.bgHover;
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "6px",
                  }}
                >
                  {/* Timestamp */}
                  <span
                    style={{
                      fontFamily: tokens.fonts.mono,
                      fontSize: "13px",
                      fontWeight: 700,
                      color: isActive
                        ? tokens.colors.cyan
                        : tokens.colors.textPrimary,
                      minWidth: "50px",
                    }}
                  >
                    {entry.timestamp_in_video}
                  </span>

                  {/* Risk Badge */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: tokens.radius.full,
                      background: entryRisk.bg,
                      color: entryRisk.color,
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {entry.risk_level}
                  </span>
                </div>

                {/* Description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: isActive
                      ? tokens.colors.textPrimary
                      : tokens.colors.textSecondary,
                  }}
                >
                  {entry.description}
                </p>

                {/* Entities */}
                {entry.entities_detected && entry.entities_detected.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                      marginTop: "6px",
                    }}
                  >
                    {entry.entities_detected.map((entity, eIdx) => (
                      <span
                        key={eIdx}
                        style={{
                          padding: "1px 6px",
                          borderRadius: tokens.radius.sm,
                          background: tokens.colors.bgTertiary,
                          color: tokens.colors.textMuted,
                          fontSize: "10px",
                          border: `1px solid ${tokens.colors.borderDefault}`,
                        }}
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
