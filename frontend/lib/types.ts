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

// Phase 3: Path types

export type StepStatus = "pending" | "in_progress" | "done" | "skipped";
export type LegalCode = "BNS" | "BNSS" | "BSA";

export interface LegalSectionOut {
  id: string;
  code: LegalCode;
  section_number: string;
  title: string;
  text: string;
}

export interface CaseSectionOut {
  id: string;
  case_id: string;
  legal_section_id: string;
  ai_reasoning: string;
  confidence: number;
  status: string;
  legal_section: LegalSectionOut;
}


export interface PathStepOut {
  id: string;
  path_id: string;
  step_order: number;
  title: string;
  description: string;
  sop_citation: string;
  status: StepStatus;
  suggested_action_type: string | null;
}

export interface InvestigationPathOut {
  id: string;
  case_id: string;
  generated_at: string;
  model_used: string;
  steps: PathStepOut[];
}

export interface PathGenerationStatusOut {
  case_id: string;
  status: "processing" | "done" | "failed" | "not_started";
  message: string;
  path: InvestigationPathOut | null;
  case_sections: CaseSectionOut[];
}

export type RequestStatus = "draft" | "approved" | "dispatched" | "responded";
export type ProviderType = "telecom" | "bank" | "platform";

export interface LegalRequestOut {
  id: string;
  case_id: string;
  path_step_id: string | null;
  provider_type: ProviderType;
  provider_name: string;
  template_used: string;
  generated_body: string;
  recipient_email: string;
  status: RequestStatus;
  dispatched_at: string | null;
}

export interface ProviderResponseOut {
  id: string;
  legal_request_id: string;
  received_at: string;
  file_path: string | null;
  parsed_data: { records: Record<string, any>[] };
  ai_insights: string;
}

export interface CaseSummaryOut {
  id: string;
  case_id: string;
  version: number;
  content: string;
  generated_at: string;
}

export interface AuditEventOut {
  id: string;
  case_id: string;
  user_id: string | null;
  action: string;
  detail: Record<string, any>;
  created_at: string;
}

export interface EvidenceOut {
  id: string;
  case_id: string;
  file_path: string;
  ai_tags: {
    description: string;
    tags: string[];
    confidence: number;
    flagged_features: string[];
  };
  uploaded_at: string;
}

