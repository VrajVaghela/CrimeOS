
-- 0014_caselog_outbox.sql
-- Create caselog_outbox table for publishing intel events
CREATE TABLE IF NOT EXISTS caselog_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    source VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    linked_entity_ids JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
