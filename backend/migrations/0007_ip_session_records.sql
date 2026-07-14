
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE ip_session_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    ip_address          INET NOT NULL,
    session_start       TIMESTAMPTZ,
    session_end         TIMESTAMPTZ,
    account_identifier  TEXT,
    port_number         TEXT,
    raw_row_ref         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ip_session_request ON ip_session_records(legal_request_id);
CREATE INDEX idx_ip_session_ip ON ip_session_records(ip_address);
