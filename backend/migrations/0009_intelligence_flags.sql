
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE intelligence_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,
    legal_request_id    UUID REFERENCES legal_requests(id),
    flag_type           TEXT NOT NULL,
    severity            TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    summary             TEXT NOT NULL,
    linked_entity_ids   UUID[],
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_intel_flags_case ON intelligence_flags(case_id);
CREATE INDEX idx_intel_flags_severity ON intelligence_flags(severity);
