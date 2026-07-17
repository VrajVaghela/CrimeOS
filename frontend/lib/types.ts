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
  parent_path_id: string | null;
  revision_number: number;
  trigger_type: string;
  change_reason: string | null;
  is_active: boolean;
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

export interface CaseEntityOut {
  id: string;
  case_id: string;
  entity_type: string;
  canonical_value: string;
  display_value: string;
  confidence: number;
  status: string; // confirmed, unconfirmed, ignored
  first_seen_at: string;
  last_seen_at: string;
}

export interface EntityRelationshipOut {
  id: string;
  case_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  confidence: number;
  evidence_ref: Record<string, any>;
}

export interface RelatedCaseMatch {
  entity_type: string;
  value: string;
  confidence: number;
}

export interface RelatedCaseOut {
  case_id: string;
  case_number: string;
  title: string;
  status: string;
  matches: RelatedCaseMatch[];
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

export interface EvidenceMarkerOut {
  id: string;
  evidence_file_id: string;
  marker_type: string;
  start_ms: number | null;
  end_ms: number | null;
  transcript_text: string | null;
  linked_entity_ids: string[];
  created_at: string;
}

export interface EvidenceOut {
  id: string;
  case_id: string;
  file_path: string;
  file_type: string | null;
  transcript: string | null;
  translation: string | null;
  ai_tags: {
    description: string;
    tags: string[];
    confidence: number;
    flagged_features?: string[];
    video_status?: string;
    progress_percentage?: number;
    error_detail?: string | null;
    original_md5?: string;
    summary?: string | null;
    crime_summary?: string | null;
    risk_evaluation?: string | null;
    timeline?: any[];
  };
  uploaded_at: string;
  markers: EvidenceMarkerOut[];
}

export interface WorkflowStageOut {
  stage: string;
  label: string;
  label_hi: string;
  status: "pending" | "in_progress" | "done" | "skipped";
  is_completed: boolean;
}

export interface RecentActivityOut {
  id: string;
  action: string;
  timestamp: string;
  actor_name: string | null;
  detail: Record<string, any> | null;
}

export interface CaseWorkflowStateOut {
  case_id: string;
  current_stage: string;
  blocker_codes: string[];
  next_action_type: string | null;
  next_action_label: string | null;
  updated_at: string;
  stages: WorkflowStageOut[];
  completion_percentage: number;
  recent_activity: RecentActivityOut[];
}

export interface CommandCenterOut {
  case_id: string;
  case_number: string;
  title: string;
  status: string;
  crime_type: string | null;
  created_at: string;
  workflow: CaseWorkflowStateOut;
}


// Phase 8D: Copilot types
export interface AiCitationOut {
  id: string;
  output_type: string;
  output_id: string;
  source_type: string;
  source_id: string;
  excerpt: string | null;
  locator: string | null;
  confidence: number | null;
  created_at: string;
}

export interface CopilotMessageOut {
  id: string;
  case_id: string;
  user_id: string | null;
  role: "user" | "assistant";
  message: string;
  cited_source_ids: string[];
  citations: AiCitationOut[];
  created_at: string;
}

export interface ReadinessItem {
  key: string;
  label: string;
  status: "passed" | "failed" | "warning";
  message: string;
  fix: string | null;
}

export interface RequestReadinessOut {
  is_ready: boolean;
  items: ReadinessItem[];
}

export interface ResponseCorrelationOut {
  id: string;
  response_id: string;
  row_index: number;
  source_row: Record<string, any>;
  matched_entity_id: string | null;
  matched_entity_value: string | null;
  reason: string;
  confidence: number;
  linked_path_step_id: string | null;
  linked_path_step_title: string;
  is_promoted: boolean;
}


// Timeline Agent types

export type TimelineEventType =
  | "complaint_filed"
  | "entity_extracted"
  | "path_generated"
  | "step_completed"
  | "request_dispatched"
  | "response_received"
  | "cctv_frame"
  | "officer_note";

export interface TimelineEventOut {
  id: string;
  case_id: string;
  occurred_at: string;
  event_type: TimelineEventType;
  title: string;
  description: string;
  location: string | null;
  confidence: number | null;
  source_ref: Record<string, unknown>;
  ai_generated: boolean;
  evidence_file_id: string | null;
  cctv_analysis: CctvAnalysisDetail | null;
  created_at: string;
}

export interface CctvAnalysisDetail {
  detected_timestamp: string;
  location_description: string;
  persons_detected: string[];
  vehicles_detected: string[];
  forensic_flags: string[];
  confidence: number;
}

export interface CctvPinOut {
  event: TimelineEventOut;
  analysis: CctvAnalysisDetail;
}

export interface OfficerNoteIn {
  title: string;
  description: string;
  occurred_at: string; // ISO 8601
  location?: string | null;
}

// Phase 10B: OSINT types
export type OsintScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface OsintScanMetadata {
  id: string;
  case_id: string;
  entity_id: string;
  entity_type: string;
  entity_value: string;
  status: OsintScanStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OsintSocialProfile {
  platform: string;
  username: string;
  profile_url: string;
  profile_picture_url: string | null;
  bio: string | null;
  location_hint: string | null;
  timezone_hint: string | null;
  follower_count: number | null;
  follower_count_delta: number | null;
  bio_changed: boolean;
  location_changed: boolean;
  is_verified: boolean;
  exists_confidence: "CONFIRMED" | "LIKELY" | "UNCERTAIN";
}

export interface OsintDataBreach {
  breach_name: string;
  breach_domain: string | null;
  leak_date: string | null;
  exposed_data_classes: string[];
  record_count: number | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  source_note: string | null;
}

export interface OsintRiskSummary {
  total_breaches: number;
  critical_breaches: number;
  platforms_found: number;
  overall_risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface OsintDiscoveredFootprint {
  entity_id: string;
  entity_type: string;
  display_value: string;
  confidence: number;
  source_field: string;
  source_snippet: string | null;
}

export interface OsintScanResult {
  scan: OsintScanMetadata;
  social_profiles: OsintSocialProfile[];
  breaches: OsintDataBreach[];
  risk_summary: OsintRiskSummary;
  discovered_footprints: OsintDiscoveredFootprint[];
}

export interface OsintScanResultResponse {
  osint: OsintScanResult;
}

// Phase 10C: Video evidence analysis
export interface VideoUploadResponse {
  case_id: string;
  task_id: string;
  status: string;
}

export interface VideoStatusResponse {
  task_id: string;
  case_id: string | null;
  celery_state: string;
  video_case_status: string | null;
  progress_percentage: number;
  error_detail: string | null;
}

export interface VideoTimelineEntry {
  timestamp_in_video: string;
  timestamp_seconds: number;
  description: string;
  entities_detected: string[] | null;
  risk_level: string;
  sequence_order: number;
}

export interface VideoReportResponse {
  case_id: string;
  filename: string;
  original_md5: string;
  duration_seconds: number | null;
  file_size_bytes: number;
  status: string;
  risk_evaluation: string | null;
  summary: string | null;
  crime_summary: string | null;
  created_at: string;
  timeline: VideoTimelineEntry[];
  chain_valid: boolean;
}





