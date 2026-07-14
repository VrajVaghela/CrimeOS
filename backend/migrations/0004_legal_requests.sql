
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE legal_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,
    provider_id         UUID NOT NULL REFERENCES service_providers(id),
    template_type       TEXT NOT NULL CHECK (template_type IN
                          ('IP_LOG_REQUEST','CDR_REQUEST','KYC_REQUEST',
                           'ACCOUNT_FREEZE_REQUEST','SUBSCRIBER_DETAILS_REQUEST',
                           'BANK_STATEMENT_REQUEST')),
    linked_entity_ids   UUID[] NOT NULL,
    request_number      TEXT NOT NULL UNIQUE,
    rendered_doc_path   TEXT,
    status              TEXT NOT NULL DEFAULT 'DRAFTED' CHECK (status IN
                          ('DRAFTED','QUEUED','SENT','ACKNOWLEDGED','RESPONDED',
                           'OVERDUE','CLOSED','REJECTED_BY_PROVIDER')),
    drafted_by          TEXT NOT NULL,
    approved_by         TEXT,
    dispatched_at       TIMESTAMPTZ,
    sla_due_at          TIMESTAMPTZ,
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_legal_requests_case_id ON legal_requests(case_id);
CREATE INDEX idx_legal_requests_status ON legal_requests(status);
CREATE INDEX idx_legal_requests_provider ON legal_requests(provider_id);
CREATE INDEX idx_legal_requests_sla_due ON legal_requests(sla_due_at) WHERE status NOT IN ('CLOSED');
