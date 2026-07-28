import type {
  CaseCreateIn,
  CaseDetailOut,
  CaseOut,
  ComplaintOut,
  DashboardOut,
  ExtractedEntityOut,
  IngestionStatusOut,
  TokenResponse,
  UserOut,
  PathGenerationStatusOut,
  PathStepOut,
  LegalRequestOut,
  ProviderResponseOut,
  CaseSummaryOut,
  AuditEventOut,
  EvidenceOut,
  CaseSectionOut,
  CommandCenterOut,
  CopilotMessageOut,
  VideoUploadResponse,
  VideoStatusResponse,
  VideoReportResponse,
} from "@/lib/types";


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "crime_os_token";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
  detail?: string;
}

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const message =
      body.error?.message ?? body.detail ?? "Request failed";
    throw new ApiError(body.error?.code ?? "api_error", message);
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<UserOut> {
  return request<UserOut>("/auth/me");
}

export async function getDashboard(): Promise<DashboardOut> {
  return request<DashboardOut>("/cases/dashboard");
}

// Cases

export async function getCases(): Promise<CaseOut[]> {
  return request<CaseOut[]>("/cases");
}

export async function createCase(body: CaseCreateIn): Promise<CaseOut> {
  return request<CaseOut>("/cases", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCase(caseId: string): Promise<CaseDetailOut> {
  return request<CaseDetailOut>(`/cases/${caseId}`);
}

// Ingestion

export async function uploadComplaint(
  caseId: string,
  file: File
): Promise<IngestionStatusOut> {
  const form = new FormData();
  form.append("file", file);
  return request<IngestionStatusOut>(`/ingestion/cases/${caseId}/complaints`, {
    method: "POST",
    body: form,
  });
}

export async function getComplaint(
  caseId: string,
  complaintId: string
): Promise<ComplaintOut> {
  return request<ComplaintOut>(
    `/ingestion/cases/${caseId}/complaints/${complaintId}`
  );
}

export async function updateEntity(
  caseId: string,
  complaintId: string,
  entityId: string,
  value: string
): Promise<ExtractedEntityOut> {
  return request<ExtractedEntityOut>(
    `/ingestion/cases/${caseId}/complaints/${complaintId}/entities/${entityId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ value }),
    }
  );
}

// Phase 3: Investigation paths

export async function getCasePath(caseId: string): Promise<PathGenerationStatusOut> {
  return request<PathGenerationStatusOut>(`/paths/cases/${caseId}`);
}

export async function generateCasePath(caseId: string): Promise<PathGenerationStatusOut> {
  return request<PathGenerationStatusOut>(`/paths/cases/${caseId}/generate`, {
    method: "POST",
  });
}

export async function updateStepStatus(stepId: string, status: string): Promise<PathStepOut> {
  return request<PathStepOut>(`/paths/steps/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Phase 4: Legal Requests API
export async function getRequests(caseId: string): Promise<LegalRequestOut[]> {
  return request<LegalRequestOut[]>(`/requests/cases/${caseId}`);
}

export async function createRequest(body: {
  case_id: string;
  path_step_id?: string | null;
  provider_name: string;
  recipient_email: string;
}): Promise<LegalRequestOut> {
  return request<LegalRequestOut>("/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRequest(requestId: string): Promise<LegalRequestOut> {
  return request<LegalRequestOut>(`/requests/${requestId}`);
}

export async function updateRequest(
  requestId: string,
  body: { generated_body: string; provider_name: string; recipient_email: string }
): Promise<LegalRequestOut> {
  return request<LegalRequestOut>(`/requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function approveRequest(requestId: string): Promise<LegalRequestOut> {
  return request<LegalRequestOut>(`/requests/${requestId}/approve`, {
    method: "POST",
  });
}

export async function dispatchRequest(requestId: string): Promise<LegalRequestOut> {
  return request<LegalRequestOut>(`/requests/${requestId}/dispatch`, {
    method: "POST",
  });
}

export async function triggerMockResponse(requestId: string): Promise<ProviderResponseOut> {
  return request<ProviderResponseOut>(`/mock/provider/respond/${requestId}`, {
    method: "POST",
  });
}

export async function getCaseResponses(caseId: string): Promise<ProviderResponseOut[]> {
  return request<ProviderResponseOut[]>(`/responses/cases/${caseId}`);
}

export async function getRequestResponse(requestId: string): Promise<ProviderResponseOut> {
  return request<ProviderResponseOut>(`/responses/requests/${requestId}`);
}

export async function regenerateInsights(responseId: string): Promise<ProviderResponseOut> {
  return request<ProviderResponseOut>(`/responses/${responseId}/insights`, {
    method: "POST",
  });
}

// Phase 5: Summaries
export async function getCaseSummaries(caseId: string): Promise<CaseSummaryOut[]> {
  return request<CaseSummaryOut[]>(`/summaries/cases/${caseId}`);
}

export async function generateSummary(caseId: string): Promise<CaseSummaryOut> {
  return request<CaseSummaryOut>(`/summaries/cases/${caseId}/generate`, {
    method: "POST",
  });
}

// Phase 5: Audit timeline
export async function getAuditEvents(caseId: string): Promise<AuditEventOut[]> {
  return request<AuditEventOut[]>(`/audit/cases/${caseId}`);
}

// Phase 5: Case search
export async function searchCases(q: string): Promise<CaseOut[]> {
  return request<CaseOut[]>(`/cases/search?q=${encodeURIComponent(q)}`);
}

// Phase 6: Evidence Gallery
export async function getEvidence(caseId: string): Promise<EvidenceOut[]> {
  return request<EvidenceOut[]>(`/evidence/cases/${caseId}`);
}

export async function uploadEvidence(caseId: string, file: File): Promise<EvidenceOut> {
  const form = new FormData();
  form.append("file", file);
  return request<EvidenceOut>(`/evidence/cases/${caseId}`, {
    method: "POST",
    body: form,
  });
}

// Phase 6: CCTNS Sync
export async function syncCctns(caseId: string): Promise<{
  case_id: string;
  cctns_fir_number: string;
  synchronized_at: string;
  status: string;
  message: string;
}> {
  return request<{
    case_id: string;
    cctns_fir_number: string;
    synchronized_at: string;
    status: string;
    message: string;
  }>("/mock/cctns/sync", {
    method: "POST",
    body: JSON.stringify({ case_id: caseId }),
  });
}

// Phase 6: Legal Advisor section reviews
export async function updateSectionStatus(sectionId: string, status: string): Promise<CaseSectionOut> {
  return request<CaseSectionOut>(`/paths/sections/${sectionId}/status?status=${encodeURIComponent(status)}`, {
    method: "PATCH",
  });
}

// Phase 6: SHO Pending Requests approvals
export async function getPendingRequests(): Promise<LegalRequestOut[]> {
  return request<LegalRequestOut[]>("/requests/pending");
}

export async function getCommandCenter(caseId: string): Promise<CommandCenterOut> {
  return request<CommandCenterOut>(`/command_center/${caseId}`);
}

// Phase 8B: Path Revisions and Case Entity Intelligence APIs
import type {
  CaseEntityOut,
  EntityRelationshipOut,
  RelatedCaseOut,
  InvestigationPathOut,
} from "@/lib/types";

export async function getPathRevisions(caseId: string): Promise<InvestigationPathOut[]> {
  return request<InvestigationPathOut[]>(`/paths/cases/${caseId}/revisions`);
}

export async function triggerPathRevision(
  caseId: string,
  body: { trigger_type: string; change_reason: string }
): Promise<InvestigationPathOut> {
  return request<InvestigationPathOut>(`/paths/cases/${caseId}/revision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCaseEntities(caseId: string): Promise<CaseEntityOut[]> {
  return request<CaseEntityOut[]>(`/entities/cases/${caseId}`);
}

export async function getEntityRelationships(caseId: string): Promise<EntityRelationshipOut[]> {
  return request<EntityRelationshipOut[]>(`/entities/cases/${caseId}/relationships`);
}

export async function getRelatedCases(caseId: string): Promise<RelatedCaseOut[]> {
  return request<RelatedCaseOut[]>(`/entities/cases/${caseId}/related-cases`);
}

export async function syncEntities(caseId: string): Promise<CaseEntityOut[]> {
  return request<CaseEntityOut[]>(`/entities/cases/${caseId}/sync`, {
    method: "POST",
  });
}

// Phase 8C: Evidence Markers, Links, and Promotion APIs
import type { EvidenceMarkerOut } from "@/lib/types";

export async function createEvidenceMarker(
  evidenceId: string,
  body: {
    marker_type: string;
    start_ms?: number | null;
    end_ms?: number | null;
    transcript_text?: string | null;
    linked_entity_ids?: string[];
  }
): Promise<EvidenceMarkerOut> {
  return request<EvidenceMarkerOut>(`/evidence/${evidenceId}/markers`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function linkEvidenceMarkerToEntity(
  markerId: string,
  entityId: string
): Promise<EvidenceMarkerOut> {
  return request<EvidenceMarkerOut>(`/evidence/markers/${markerId}/link?entity_id=${entityId}`, {
    method: "POST",
  });
}

export async function promoteEvidenceMarker(
  markerId: string,
  note?: string
): Promise<EvidenceMarkerOut> {
  const url = note
    ? `/evidence/markers/${markerId}/promote?note=${encodeURIComponent(note)}`
    : `/evidence/markers/${markerId}/promote`;
  return request<EvidenceMarkerOut>(url, {
    method: "POST",
  });
}


export async function getCopilotChat(caseId: string): Promise<CopilotMessageOut[]> {
  return request<CopilotMessageOut[]>(`/copilot/cases/${caseId}/chat`);
}

export async function askCopilot(caseId: string, question: string): Promise<CopilotMessageOut> {
  return request<CopilotMessageOut>(`/copilot/cases/${caseId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

import type { RequestReadinessOut, ResponseCorrelationOut } from "@/lib/types";

export async function getRequestReadiness(requestId: string): Promise<RequestReadinessOut> {
  return request<RequestReadinessOut>(`/requests/${requestId}/readiness`);
}

export async function getResponseCorrelations(responseId: string): Promise<ResponseCorrelationOut[]> {
  return request<ResponseCorrelationOut[]>(`/responses/${responseId}/correlations`);
}

export async function promoteResponseRow(
  responseId: string,
  rowIndex: number
): Promise<{ message: string; citation_id: string }> {
  return request<{ message: string; citation_id: string }>(`/responses/${responseId}/promote/${rowIndex}`, {
    method: "POST",
  });
}


// Timeline Agent
import type { TimelineEventOut, CctvPinOut } from "@/lib/types";

export async function getCaseTimeline(caseId: string): Promise<TimelineEventOut[]> {
  return request<TimelineEventOut[]>(`/timeline/cases/${caseId}`);
}

export async function uploadCctvFrame(
  caseId: string,
  file: File
): Promise<CctvPinOut> {
  const form = new FormData();
  form.append("file", file);
  return request<CctvPinOut>(`/timeline/cases/${caseId}/cctv`, {
    method: "POST",
    body: form,
  });
}

export async function addTimelineNote(
  caseId: string,
  data: { title: string; description: string; occurred_at: string; location: string | null }
): Promise<TimelineEventOut> {
  return request<TimelineEventOut>(`/timeline/cases/${caseId}/notes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Phase 10B: OSINT API Calls
import type { OsintScanResultResponse } from "@/lib/types";

export async function getEntityOsintResult(
  caseId: string,
  entityId: string
): Promise<OsintScanResultResponse> {
  return request<OsintScanResultResponse>(`/cases/${caseId}/osint/${entityId}`);
}

export async function triggerEntityOsint(
  caseId: string,
  entityId: string
): Promise<{ status: string; scan_id: string }> {
  return request<{ status: string; scan_id: string }>(`/cases/${caseId}/osint/${entityId}/trigger`, {
    method: "POST",
  });
}

export async function confirmPivot(
  caseId: string,
  entityId: string
): Promise<{
  success: boolean;
  entity: { id: string; status: string };
  scan: { scan_id: string; status: string } | null;
}> {
  return request<{
    success: boolean;
    entity: { id: string; status: string };
    scan: { scan_id: string; status: string } | null;
  }>(`/cases/${caseId}/osint/pivots/${entityId}/confirm`, {
    method: "POST",
  });
}

export async function ignorePivot(
  caseId: string,
  entityId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/cases/${caseId}/osint/pivots/${entityId}/ignore`, {
    method: "POST",
  });
}

export async function exportDossier(caseId: string, entityId: string): Promise<string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}/cases/${caseId}/osint/${entityId}/export`, {
    headers,
  });
  if (!response.ok) {
    throw new Error("Failed to export dossier");
  }
  return response.text();
}

// Phase 10C: Video analysis API client helpers
export function uploadVideo(
  caseId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<VideoUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("case_id", caseId);
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: VideoUploadResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("POST", `${API_URL}/video/analyze`);
    
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    
    xhr.send(formData);
  });
}

export async function pollVideoStatus(taskId: string): Promise<VideoStatusResponse> {
  return request<VideoStatusResponse>(`/video/status/${taskId}`);
}

export async function getVideoReport(caseId: string): Promise<VideoReportResponse> {
  return request<VideoReportResponse>(`/video/report/${caseId}`);
}
// Multilingual translation (Tier 2 — display transform, not stored in DB)
export interface TranslateOut {
  translated: string;
  fallback: boolean; // true = Gemini failed, original English returned
  cached: boolean;   // true = served from backend in-memory cache
}

/**
 * Translate AI-generated text into Hindi or Gujarati.
 * Call this ONLY via useTranslatedContent() hook, never directly in components.
 * Does NOT write audit events (display-only transform).
 * Preserves legal identifiers verbatim per TRANSLATION_PROMPT rules.
 */
export async function translateText(
  text: string,
  targetLang: "en" | "hi" | "gu"
): Promise<TranslateOut> {
  return request<TranslateOut>("/translate", {
    method: "POST",
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
}

