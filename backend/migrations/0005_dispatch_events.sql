
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE dispatch_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    event_type          TEXT NOT NULL CHECK (event_type IN
                          ('QUEUED','SMTP_SENT','SMTP_FAILED','ACK_RECEIVED','BOUNCED')),
    detail              JSONB,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispatch_events_request ON dispatch_events(legal_request_id);
