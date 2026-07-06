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
