
import { apiFetch } from "./client";
import type { ListIntelligenceFlagsResponse } from "../types/intelligence";

export async function listIntelligenceFlags(
  caseId: string,
  severity?: string
): Promise<ListIntelligenceFlagsResponse> {
  const params = new URLSearchParams();
  if (severity) params.set("severity", severity);
  const queryString = params.toString();
  return apiFetch(
    `/api/v1/cases/${caseId}/intelligence-flags${queryString ? `?${queryString}` : ""}`
  );
}
