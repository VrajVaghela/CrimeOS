
import type { LegalRequest } from "./legalRequest";

export interface DispatchEvent {
  id: string; // uuid
  legal_request_id: string; // uuid
  event_name: "QUEUED" | "SMTP_SENT" | "SMTP_FAILED" | "ACK_RECEIVED" | "OVERDUE_MARKED" | "REJECTED_BY_PROVIDER";
  details: Record<string, any>;
  created_at: string;
}

export interface ListDispatchEventsResponse {
  events: DispatchEvent[];
}

export interface ListLegalRequestsByStatusResponse {
  legal_requests: LegalRequest[];
}
