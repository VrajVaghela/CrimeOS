
import { apiFetch } from "./client";
import type {
  CDRRecord,
  IPSessionRecord,
  BankTransactionRecord,
  RawResponseDump,
  PaginatedRecords,
  UploadResponseResponse,
} from "../types/analytics";

export async function uploadResponse(
  legalRequestId: string,
  file: File
): Promise<UploadResponseResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch(`/api/v1/legal-requests/${legalRequestId}/responses`, {
    method: "POST",
    body: formData,
  });
}

export async function getResponseDump(
  legalRequestId: string,
  dumpId: string
): Promise<RawResponseDump> {
  return apiFetch(`/api/v1/legal-requests/${legalRequestId}/responses/${dumpId}`);
}

export async function listCDRRecords(
  legalRequestId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedRecords<CDRRecord>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  const queryString = params.toString();
  return apiFetch(
    `/api/v1/legal-requests/${legalRequestId}/cdr-records${queryString ? `?${queryString}` : ""}`
  );
}

/** Alias matching checkpoint naming. */
export const listCdrRecords = listCDRRecords;

export async function listIPSessionRecords(
  legalRequestId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedRecords<IPSessionRecord>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  const queryString = params.toString();
  return apiFetch(
    `/api/v1/legal-requests/${legalRequestId}/ip-session-records${queryString ? `?${queryString}` : ""}`
  );
}

/** Alias matching checkpoint naming. */
export const listIpSessionRecords = listIPSessionRecords;

export async function listBankTransactionRecords(
  legalRequestId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedRecords<BankTransactionRecord>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  const queryString = params.toString();
  return apiFetch(
    `/api/v1/legal-requests/${legalRequestId}/bank-transaction-records${queryString ? `?${queryString}` : ""}`
  );
}
