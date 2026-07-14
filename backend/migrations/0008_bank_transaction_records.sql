
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE bank_transaction_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    txn_ref             TEXT NOT NULL,
    txn_date            TIMESTAMPTZ NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    txn_type            TEXT CHECK (txn_type IN ('CREDIT','DEBIT')),
    counterparty_account TEXT,
    counterparty_upi    TEXT,
    narration           TEXT,
    raw_row_ref         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_txn_request ON bank_transaction_records(legal_request_id);
CREATE INDEX idx_bank_txn_counterparty_upi ON bank_transaction_records(counterparty_upi);
CREATE INDEX idx_bank_txn_date ON bank_transaction_records(txn_date);
