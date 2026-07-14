
export interface IntelligenceFlag {
  id: string;
  case_id: string;
  legal_request_id: string;
  flag_type: "VPN_PROXY_IP" | "REPEATED_COUNTERPARTY" | "TOWER_LOCATION_CLUSTER" | "HIGH_VALUE_TRANSACTION";
  severity: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  raw_row_refs: string[];
  record_ids: string[];
  created_at: string;
}

export interface ListIntelligenceFlagsResponse {
  flags: IntelligenceFlag[];
}
