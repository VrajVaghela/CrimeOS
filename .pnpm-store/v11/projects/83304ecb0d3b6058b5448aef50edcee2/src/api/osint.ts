import { apiFetch } from "./client";
import type { GetEntityScanResultResponse } from "../types/osint";

export async function getEntityScanResult(
  caseId: string,
  entityId: string
): Promise<GetEntityScanResultResponse> {
  return apiFetch(`/api/v1/cases/${caseId}/osint/${entityId}`);
}
