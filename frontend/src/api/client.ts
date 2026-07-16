/**
 * API Client — Typed Functions for Backend Communication
 * ========================================================
 * Provides typed API functions matching Stage 3's REST endpoints:
 *   - uploadVideo: POST /api/v1/video/analyze
 *   - pollStatus: GET /api/v1/video/status/{task_id}
 *   - getReport: GET /api/v1/video/report/{case_id}
 *
 * All interfaces mirror the backend Pydantic/SQLAlchemy shapes exactly.
 * No `any` types are used.
 */

// ── API Base URL ────────────────────────────────────────────────────────────
const API_BASE = "/api/v1/video";

// ── TypeScript Interfaces ───────────────────────────────────────────────────

/** Response from POST /api/v1/video/analyze */
export interface UploadResponse {
  case_id: string;
  task_id: string;
  status: string;
}

/** Response from GET /api/v1/video/status/{task_id} */
export interface StatusResponse {
  task_id: string;
  case_id: string | null;
  celery_state: string;
  video_case_status: string | null;
  progress_percentage: number;
  error_detail: string | null;
}

/** A single timeline entry in the report */
export interface TimelineEntry {
  timestamp_in_video: string;
  timestamp_seconds: number;
  description: string;
  entities_detected: string[] | null;
  risk_level: string;
  sequence_order: number;
}

/** Response from GET /api/v1/video/report/{case_id} */
export interface ReportResponse {
  case_id: string;
  filename: string;
  original_md5: string;
  duration_seconds: number | null;
  file_size_bytes: number;
  status: string;
  risk_evaluation: string | null;
  summary: string | null;
  crime_summary: string | null;
  created_at: string;
  timeline: TimelineEntry[];
  chain_valid: boolean;
}

/** Error response from the API */
export interface ApiError {
  detail: string;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Upload a video file for AI-powered incident analysis.
 *
 * Uses XMLHttpRequest instead of fetch to provide upload progress events,
 * since the Fetch API does not expose upload progress natively.
 *
 * @param file - The video File to upload
 * @param onProgress - Optional callback receiving upload progress (0-100)
 * @returns Promise resolving to the upload response with case_id and task_id
 * @throws Error if the upload fails or the server rejects the file
 */
export function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const error: ApiError = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was aborted"));
    });

    xhr.open("POST", `${API_BASE}/analyze`);
    xhr.send(formData);
  });
}

/**
 * Poll the status of a video analysis task.
 *
 * @param taskId - The Celery task ID to check
 * @returns Promise resolving to the current task/case status
 * @throws Error if the task ID doesn't exist (404) or server error
 */
export async function pollStatus(taskId: string): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status/${taskId}`);

  if (response.status === 404) {
    throw new Error(`Task '${taskId}' not found`);
  }

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.detail || `Status check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Retrieve the completed analysis report for a video case.
 *
 * @param caseId - The UUID of the video case
 * @returns Promise resolving to the full report with timeline and chain validity
 * @throws Error if case not found (404) or not yet complete (425)
 */
export async function getReport(caseId: string): Promise<ReportResponse> {
  const response = await fetch(`${API_BASE}/report/${caseId}`);

  if (response.status === 404) {
    throw new Error(`Case '${caseId}' not found`);
  }

  if (response.status === 425) {
    throw new Error("Analysis not yet complete. Please try again later.");
  }

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.detail || `Report fetch failed: ${response.status}`);
  }

  return response.json();
}
