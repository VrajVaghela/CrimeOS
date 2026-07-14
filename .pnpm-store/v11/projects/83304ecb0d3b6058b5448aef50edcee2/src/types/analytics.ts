
export interface CDRRecord {
  id: string;
  legal_request_id: string;
  caller_number: string;
  callee_number: string;
  call_type: string;
  call_start: string;
  duration_seconds: number;
  cell_tower_id: string | null;
  imei: string | null;
  imsi: string | null;
  raw_row_ref: string;
  created_at: string;
}

export interface IPSessionRecord {
  id: string;
  legal_request_id: string;
  ip_address: string;
  account_identifier: string;
  session_start: string | null;
  session_end: string | null;
  port_number: string | null;
  raw_row_ref: string;
  created_at: string;
}

export interface BankTransactionRecord {
  id: string;
  legal_request_id: string;
  txn_ref: string;
  txn_date: string;
  amount: string;
  txn_type: string;
  counterparty_account: string | null;
  counterparty_upi: string | null;
  narration: string | null;
  raw_row_ref: string;
  created_at: string;
}

export interface PaginatedRecords<T> {
  records: T[];
  total: number;
}

export interface FileMeta {
  filename: string;
  size: number;
  type: string;
  storage_path: string;
}

export interface RawResponseDump {
  _id: string;
  legal_request_id: string;
  case_id: string;
  file_meta: FileMeta;
  parse_status: "PENDING" | "PARSING" | "PARSED" | "FAILED";
  row_count_detected?: number;
  row_count_parsed?: number;
  parse_errors?: any[];
  uploaded_by: string;
  uploaded_at: string;
}

export interface UploadResponseResponse {
  dump_id: string;
  parse_status: RawResponseDump["parse_status"];
}
