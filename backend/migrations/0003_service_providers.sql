
-- From Stage 1 Checkpoint 2 (ARCHITECTURE.md §1.3)
CREATE TABLE service_providers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    provider_category   TEXT NOT NULL CHECK (provider_category IN
                          ('TELECOM','BANK','SOCIAL_PLATFORM','ISP','FINTECH','OTHER')),
    nodal_officer_email TEXT NOT NULL,
    nodal_officer_phone TEXT,
    lers_portal_url     TEXT,
    sla_hours           INT NOT NULL DEFAULT 168,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_providers_category ON service_providers(provider_category);
