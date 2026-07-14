
export interface DigitalEntity {
  id: string; // uuid
  case_id: string; // uuid
  complaint_ref_id: string | null; // uuid
  entity_type: "IP_ADDRESS" | "EMAIL" | "PHONE" | "UPI_ID" | "SOCIAL_HANDLE";
  raw_value: string;
  normalized_value: string;
  source_text_offset: [number, number];
  confidence_score: number;
  status: "EXTRACTED" | "CONFIRMED" | "REJECTED";
  extracted_by: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface ExtractEntitiesRequest {
  source_text: string;
  complaint_ref_id?: string; // uuid
}

export interface ExtractEntitiesResponse {
  entities: DigitalEntity[];
}

export interface ListEntitiesResponse {
  entities: DigitalEntity[];
  total: number;
}

export interface UpdateEntityStatusRequest {
  status: "CONFIRMED" | "REJECTED";
}
