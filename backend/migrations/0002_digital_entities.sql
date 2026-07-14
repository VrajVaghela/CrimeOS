
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE digital_entities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,
    complaint_ref_id    UUID,
    entity_type         TEXT NOT NULL CHECK (entity_type IN
                          ('IP_ADDRESS','EMAIL','PHONE','UPI_ID','SOCIAL_HANDLE','BANK_ACCOUNT')),
    raw_value           TEXT NOT NULL,
    normalized_value     TEXT NOT NULL,
    source_text_offset  INT4RANGE,
    confidence_score    NUMERIC(4,3) NOT NULL DEFAULT 1.000,
    status              TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (status IN
                          ('EXTRACTED','CONFIRMED','REJECTED','MERGED')),
    extracted_by        TEXT NOT NULL DEFAULT 'AUTO',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_digital_entities_case_id ON digital_entities(case_id);
CREATE INDEX idx_digital_entities_type_status ON digital_entities(entity_type, status);
CREATE INDEX idx_digital_entities_normalized ON digital_entities(normalized_value);
CREATE UNIQUE INDEX uq_entity_case_norm ON digital_entities(case_id, entity_type, normalized_value);
