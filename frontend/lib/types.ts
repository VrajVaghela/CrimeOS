export type UserRole = "IO" | "SHO" | "LEGAL";

export interface UserOut {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface CaseOut {
  id: string;
  case_number: string;
  title: string;
  status: string;
  crime_type: string | null;
  created_at: string;
}

export interface DashboardOut {
  active_cases: CaseOut[];
  total_cases: number;
  pending_requests: number;
  audit_events: number;
}

export interface CaseCreateIn {
  title: string;
  description?: string;
}

// Phase 2: Ingestion types

export interface ExtractedEntityOut {
  id: string;
  entity_type: string;
  value: string;
  confidence: number;
}

export interface ComplaintOut {
  id: string;
  case_id: string;
  source_type: string;
  original_file_path: string | null;
  detected_language: string | null;
  raw_text: string | null;
  translated_text: string | null;
  created_at: string;
  entities: ExtractedEntityOut[];
}

export interface IngestionStatusOut {
  complaint_id: string;
  status: "processing" | "done" | "failed";
  message: string;
}

export interface CaseDetailOut extends CaseOut {
  complaints: ComplaintOut[];
}
