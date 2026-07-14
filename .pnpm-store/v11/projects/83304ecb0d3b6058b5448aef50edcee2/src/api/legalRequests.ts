
import { apiFetch } from "./client";
import type {
  ServiceProvider,
  LegalRequest,
  LegalRequestWithEvents,
  CreateLegalRequestRequest,
  ApproveLegalRequestRequest,
  StatusSummaryResponse,
  TimelineResponse,
} from "../types/legalRequest";

export async function listServiceProviders(): Promise<{
  providers: ServiceProvider[];
  total: number;
}> {
  return apiFetch("/api/v1/service-providers");
}

/** Alias matching checkpoint naming. */
export const listProviders = listServiceProviders;

export async function createLegalRequest(
  caseId: string,
  data: CreateLegalRequestRequest
): Promise<{ legal_request: LegalRequest }> {
  return apiFetch(`/api/v1/cases/${caseId}/legal-requests`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getLegalRequest(
  id: string
): Promise<LegalRequestWithEvents> {
  return apiFetch(`/api/v1/legal-requests/${id}`);
}

export async function approveLegalRequest(
  id: string,
  data: ApproveLegalRequestRequest
): Promise<{ legal_request: LegalRequest }> {
  return apiFetch(`/api/v1/legal-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStatusSummary(
  caseId: string
): Promise<StatusSummaryResponse> {
  return apiFetch(`/api/v1/cases/${caseId}/legal-requests/summary`);
}

/** Alias matching checkpoint naming. */
export const statusSummary = getStatusSummary;

export async function getTimeline(
  caseId: string
): Promise<TimelineResponse> {
  return apiFetch(`/api/v1/cases/${caseId}/legal-requests/timeline`);
}

/** Alias used by DispatchTracker — same endpoint as getTimeline. */
export const listWithTimeline = getTimeline;
