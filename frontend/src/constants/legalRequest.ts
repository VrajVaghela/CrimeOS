import type { LegalRequest } from "../types/legalRequest";

export const TEMPLATE_TYPE_DESCRIPTIONS: Record<
  LegalRequest["template_type"],
  string
> = {
  IP_LOG_REQUEST: "Request IP session logs for a specific account or identifier.",
  CDR_REQUEST: "Request call detail records including tower location data.",
  KYC_REQUEST: "Request know-your-customer documents for linked accounts.",
  ACCOUNT_FREEZE_REQUEST: "Request immediate freeze of suspect account(s).",
  SUBSCRIBER_DETAILS_REQUEST: "Request subscriber registration details from telecom.",
  BANK_STATEMENT_REQUEST: "Request account statements and transaction history.",
};

export const LEGAL_REQUEST_STATUS_COLORS: Record<string, string> = {
  DRAFTED: "bg-gray-100 text-gray-800",
  QUEUED: "bg-blue-100 text-blue-800",
  SENT: "bg-indigo-100 text-indigo-800",
  ACKNOWLEDGED: "bg-purple-100 text-purple-800",
  RESPONDED: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  REJECTED_BY_PROVIDER: "bg-orange-100 text-orange-800",
};
