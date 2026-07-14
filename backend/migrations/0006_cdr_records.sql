
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE cdr_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    caller_number       TEXT NOT NULL,
    callee_number       TEXT NOT NULL,
    call_type           TEXT CHECK (call_type IN ('VOICE','SMS','DATA')),
    call_start          TIMESTAMPTZ NOT NULL,
    duration_seconds    INT,
    cell_tower_id       TEXT,
    imei                TEXT,
    imsi                TEXT,
    raw_row_ref         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cdr_request ON cdr_records(legal_request_id);
CREATE INDEX idx_cdr_caller ON cdr_records(caller_number);
CREATE INDEX idx_cdr_callee ON cdr_records(callee_number);
CREATE INDEX idx_cdr_tower ON cdr_records(cell_tower_id);
