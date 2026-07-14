
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    actor_id            TEXT NOT NULL,
    action              TEXT NOT NULL,
    resource_type       TEXT NOT NULL,
    resource_id         UUID,
    before_state        JSONB,
    after_state         JSONB,
    ip_address          TEXT,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at DESC);
