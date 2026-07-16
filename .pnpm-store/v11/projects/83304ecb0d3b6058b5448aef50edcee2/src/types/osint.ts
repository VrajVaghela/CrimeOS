export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface ScanMetadata {
  id: string;
  case_id: string;
  entity_id: string;
  entity_type: "IP_ADDRESS" | "EMAIL" | "PHONE" | "UPI_ID" | "SOCIAL_HANDLE";
  entity_value: string;
  status: ScanStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileConfidence = "CONFIRMED" | "LIKELY" | "UNCERTAIN";

export interface SocialProfile {
  id: string;
  scan_id: string;
  platform: string;
  username: string;
  profile_url: string;
  profile_picture_url?: string | null;
  bio?: string | null;
  follower_count?: number | null;
  is_verified: boolean;
  exists_confidence: ProfileConfidence;
  discovered_at: string;
}

export interface DataBreach {
  id: string;
  scan_id: string;
  breach_name: string;
  breach_domain?: string | null;
  leak_date?: string | null;
  exposed_data_classes: string[];
  record_count?: number | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  source_note?: string | null;
  discovered_at: string;
}

export interface RiskSummary {
  total_breaches: number;
  critical_breaches: number;
  platforms_found: number;
  overall_risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface EntityScanResult {
  scan: ScanMetadata;
  social_profiles: SocialProfile[];
  breaches: DataBreach[];
  risk_summary: RiskSummary;
}

export interface GetEntityScanResultResponse {
  osint: EntityScanResult;
}
