
import { apiFetch } from "./client";
import type {
  DigitalEntity,
  ExtractEntitiesRequest,
  ExtractEntitiesResponse,
  ListEntitiesResponse,
  UpdateEntityStatusRequest,
} from "../types/entity";

export async function extractEntities(
  caseId: string,
  data: ExtractEntitiesRequest
): Promise<ExtractEntitiesResponse> {
  return apiFetch(`/api/v1/cases/${caseId}/entities/extract`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listEntities(
  caseId: string,
  filters?: { status?: string; type?: string }
): Promise<ListEntitiesResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  const queryString = params.toString();
  return apiFetch(
    `/api/v1/cases/${caseId}/entities${queryString ? `?${queryString}` : ""}`
  );
}

export async function updateEntityStatus(
  entityId: string,
  data: UpdateEntityStatusRequest
): Promise<{ entity: DigitalEntity }> {
  return apiFetch(`/api/v1/entities/${entityId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
