/**
 * VideoUploader — Drag-and-Drop Upload Component with Progress Tracking
 * =======================================================================
 * Implements a drag-and-drop upload zone that:
 *   - Accepts only ALLOWED_VIDEO_EXTENSIONS (.mp4, .avi, .mov)
 *   - Validates file size client-side before upload attempt
 *   - Shows real-time upload progress via XMLHttpRequest
 *   - Polls analysis status after upload completes
 *   - Transitions through phase labels until COMPLETED or FAILED
 *
 * Props:
 *   - onAnalysisComplete: Callback with case_id and video object URL when done
 *   - maxSizeMB: Maximum upload size (default 500 MB)
 *
 * @module VideoUploader
 */

import { useCallback, useRef, useState } from "react";
import { uploadVideo, pollStatus } from "../api/client";
import { tokens } from "../design-tokens";

// ── Configuration ───────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = [".mp4", ".avi", ".mov"];
const POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_SIZE_MB = 500;

// ── Types ───────────────────────────────────────────────────────────────────
interface VideoUploaderProps {
  /** Callback when analysis completes with case_id and the video blob URL */
  onAnalysisComplete: (caseId: string, videoUrl: string) => void;
  /** Maximum file size in MB (default: 500) */
  maxSizeMB?: number;
}

type UploadPhase =
  | "idle"
  | "uploading"
  | "polling"
  | "completed"
  | "failed";

/** Human-readable labels for Celery/processing phases */
const PHASE_LABELS: Record<string, string> = {
  INITIALIZING: "Initializing analysis...",
  UPLOADING: "Uploading to AI engine...",
  PROCESSING_UPLOAD: "Processing upload...",
  WAITING_GEMINI: "AI is analyzing video...",
  ANALYZING: "Generating incident report...",
  PERSISTING: "Saving results...",
  CLEANING_UP: "Finalizing...",
  COMPLETED: "Analysis complete!",
  FAILED: "Analysis failed",
};

// ── Component ───────────────────────────────────────────────────────────────
export default function VideoUploader({
  onAnalysisComplete,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: VideoUploaderProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Validate file extension and size before attempting upload.
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return `File type "${ext}" is not supported. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`;
      }
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum of ${maxSizeMB} MB.`;
      }
      return null;
    },
    [maxSizeMB]
  );

  /**
   * Start polling the analysis status endpoint.
   */
  const startPolling = useCallback(
    (taskId: string, caseId: string, videoUrl: string) => {
      setPhase("polling");
      setPhaseLabel("Waiting for analysis to begin...");
      setAnalysisProgress(0);

      pollingRef.current = setInterval(async () => {
        try {
          const status = await pollStatus(taskId);

          setAnalysisProgress(status.progress_percentage);
          if (status.celery_state === "PROGRESS") {
            // Try to extract phase from meta
            setPhaseLabel(
              PHASE_LABELS[status.video_case_status || ""] ||
                `Processing (${status.progress_percentage}%)...`
            );
          }

          // Check terminal states
          if (
            status.celery_state === "SUCCESS" ||
            status.video_case_status === "COMPLETED"
          ) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPhase("completed");
            setPhaseLabel("Analysis complete!");
            setAnalysisProgress(100);
            onAnalysisComplete(caseId, videoUrl);
          } else if (
            status.celery_state === "FAILURE" ||
            status.video_case_status === "FAILED"
          ) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPhase("failed");
            setPhaseLabel("Analysis failed");
            setErrorMessage(
              status.error_detail || "An unknown error occurred during analysis."
            );
          }
        } catch (err) {
          // Don't stop polling on transient errors
          console.warn("Status poll failed:", err);
        }
      }, POLL_INTERVAL_MS);
    },
    [onAnalysisComplete]
  );

  /**
   * Handle file upload and initiate the analysis pipeline.
   */
  const handleUpload = useCallback(
    async (file: File) => {
      setErrorMessage("");
      setSelectedFile(file);

      // Client-side validation
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      // Create object URL for later video playback
      const videoUrl = URL.createObjectURL(file);

      setPhase("uploading");
      setUploadProgress(0);

      try {
        const response = await uploadVideo(file, (percent) => {
          setUploadProgress(percent);
        });

        setUploadProgress(100);
        startPolling(response.task_id, response.case_id, videoUrl);
      } catch (err) {
        setPhase("failed");
        setErrorMessage(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      }
    },
    [validateFile, startPolling]
  );

  // ── Drag-and-Drop Handlers ────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setUploadProgress(0);
    setAnalysisProgress(0);
    setPhaseLabel("");
    setErrorMessage("");
    setSelectedFile(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  // ── Render ────────────────────────────────────────────────────────────
  const isProcessing = phase === "uploading" || phase === "polling";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      {/* ── Drop Zone ──────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? tokens.colors.cyan : tokens.colors.borderAccent}`,
            borderRadius: tokens.radius.xl,
            padding: "48px 32px",
            textAlign: "center",
            cursor: "pointer",
            background: dragActive
              ? tokens.colors.cyanGlow
              : tokens.colors.bgSecondary,
            transition: `all ${tokens.transitions.default}`,
            boxShadow: dragActive
              ? `0 0 30px ${tokens.colors.cyanGlow}`
              : "none",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {/* Upload Icon */}
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
              filter: dragActive ? "brightness(1.5)" : "none",
            }}
          >
            🎬
          </div>

          <h3
            style={{
              color: tokens.colors.textPrimary,
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            {dragActive
              ? "Drop video to begin analysis"
              : "Drag & drop a video file"}
          </h3>

          <p
            style={{
              color: tokens.colors.textSecondary,
              fontSize: "14px",
              margin: "4px 0",
            }}
          >
            or click to browse files
          </p>

          <p
            style={{
              color: tokens.colors.textMuted,
              fontSize: "12px",
              marginTop: "12px",
            }}
          >
            Accepted: {ALLOWED_EXTENSIONS.join(", ")} · Max size: {maxSizeMB} MB
          </p>
        </div>
      )}

      {/* ── Progress State ─────────────────────────────────────────────── */}
      {isProcessing && (
        <div
          style={{
            background: tokens.colors.bgSecondary,
            borderRadius: tokens.radius.xl,
            padding: "32px",
            border: `1px solid ${tokens.colors.borderAccent}`,
          }}
        >
          <div style={{ marginBottom: "16px", textAlign: "center" }}>
            <h3
              style={{
                color: tokens.colors.textPrimary,
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              {selectedFile?.name}
            </h3>
            <p
              style={{
                color: tokens.colors.cyan,
                fontSize: "14px",
              }}
            >
              {phase === "uploading"
                ? `Uploading... ${uploadProgress}%`
                : phaseLabel || "Processing..."}
            </p>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "8px",
              background: tokens.colors.bgTertiary,
              borderRadius: tokens.radius.full,
              overflow: "hidden",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: `${phase === "uploading" ? uploadProgress : analysisProgress}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${tokens.colors.cyan}, ${tokens.colors.magenta})`,
                borderRadius: tokens.radius.full,
                transition: `width ${tokens.transitions.default}`,
                boxShadow: `0 0 10px ${tokens.colors.cyanGlow}`,
              }}
            />
          </div>

          <p
            style={{
              color: tokens.colors.textMuted,
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            {phase === "uploading"
              ? `${(uploadProgress).toFixed(0)}% uploaded`
              : `${analysisProgress}% complete`}
          </p>
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────────────── */}
      {phase === "failed" && (
        <div
          style={{
            background: tokens.colors.errorBg,
            border: `1px solid ${tokens.colors.error}`,
            borderRadius: tokens.radius.lg,
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
          <h3
            style={{
              color: tokens.colors.error,
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Analysis Failed
          </h3>
          <p
            style={{
              color: tokens.colors.textSecondary,
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {errorMessage}
          </p>
          <button
            onClick={handleReset}
            style={{
              background: tokens.colors.bgTertiary,
              color: tokens.colors.textPrimary,
              border: `1px solid ${tokens.colors.borderAccent}`,
              borderRadius: tokens.radius.md,
              padding: "8px 20px",
              cursor: "pointer",
              fontSize: "14px",
              transition: `all ${tokens.transitions.fast}`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = tokens.colors.bgHover;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = tokens.colors.bgTertiary;
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
