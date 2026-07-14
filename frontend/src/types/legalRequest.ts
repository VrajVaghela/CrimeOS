
import type { DispatchEvent } from "./dispatch";

export interface ServiceProvider {
  id: string; // uuid
  name: string;
  provider_category: "TELECOM" | "BANK" | "SOCIAL_PLATFORM" | "ISP";
  nodal_officer_email: string;
  nodal_officer_phone: string;
  sla_hours: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegalRequest {
  id: string; // uuid
  case_id: string; // uuid
  request_number: string;
  provider_id: string; // uuid
  template_type:
    | "IP_LOG_REQUEST"
    | "CDR_REQUEST"
    | "KYC_REQUEST"
    | "ACCOUNT_FREEZE_REQUEST"
    | "SUBSCRIBER_DETAILS_REQUEST"
    | "BANK_STATEMENT_REQUEST";
  linked_entity_ids: string[]; // uuid[]
  status: "DRAFTED" | "QUEUED" | "SENT" | "ACKNOWLEDGED" | "RESPONDED" | "OVERDUE" | "REJECTED_BY_PROVIDER";
  rendered_doc_path: string | null;
  drafted_by: string;
  approved_by: string | null;
  sla_due_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

export interface CreateLegalRequestRequest {
  provider_id: string; // uuid
  template_type: LegalRequest["template_type"];
  linked_entity_ids: string[]; // uuid[]
  drafted_by: string;
  issuing_officer_name: string;
  issuing_officer_designation: string;
  police_station: string;
  legal_basis: string;
}

export interface ApproveLegalRequestRequest {
  approved_by: string;
}

export interface LegalRequestWithEvents {
  legal_request: LegalRequest;
  /** Present on GET /legal-requests/:id */
  dispatch_events?: DispatchEvent[];
  /** Present on GET /cases/:caseId/legal-requests/timeline */
  events?: DispatchEvent[];
}

/** Normalizes timeline vs single-request response event arrays. */
export function getDispatchEvents(
  item: LegalRequestWithEvents
): DispatchEvent[] {
  return item.dispatch_events ?? item.events ?? [];
}

export interface StatusSummaryResponse {
  by_status: Record<string, number>;
  total: number;
}

export interface TimelineResponse {
  requests: LegalRequestWithEvents[];
}
