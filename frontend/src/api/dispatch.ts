
import { apiFetch } from "./client";
import type {
  ListDispatchEventsResponse,
  ListLegalRequestsByStatusResponse,
} from "../types/dispatch";

export async function dispatchLegalRequest(
  id: string
): Promise<{ message: string; legal_request_id: string }> {
  return apiFetch(`/api/v1/legal-requests/${id}/dispatch`, {
    method: "POST",
  });
}

export async function listDispatchEvents(
  id: string
): Promise<ListDispatchEventsResponse> {
  return apiFetch(`/api/v1/legal-requests/${id}/dispatch-events`);
}

export async function listLegalRequestsByStatus(
  caseId: string,
  status?: string
): Promise<ListLegalRequestsByStatusResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const queryString = params.toString();
  return apiFetch(
    `/api/v1/cases/${caseId}/legal-requests${queryString ? `?${queryString}` : ""}`
  );
}
