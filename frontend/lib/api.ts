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
