
-- OSINT & Breach Intelligence module schema.
-- Adds tables for tracking OSINT scan jobs, discovered social profiles,
-- and breach exposure data linked to confirmed digital entities.

CREATE TABLE osint_scans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id),
    entity_id       UUID NOT NULL REFERENCES digital_entities(id),
    entity_type     TEXT NOT NULL,
    entity_value    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_osint_scans_entity_id ON osint_scans(entity_id);
CREATE INDEX idx_osint_scans_case_status ON osint_scans(case_id, status);

CREATE TABLE social_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id             UUID NOT NULL REFERENCES osint_scans(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL,
    username            TEXT NOT NULL,
    profile_url         TEXT NOT NULL,
    profile_picture_url TEXT,
    bio                 TEXT,
    follower_count      INTEGER,
    is_verified         BOOLEAN NOT NULL DEFAULT false,
    exists_confidence   TEXT NOT NULL DEFAULT 'LIKELY' CHECK (exists_confidence IN ('CONFIRMED','LIKELY','UNCERTAIN')),
    discovered_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_profiles_scan_id ON social_profiles(scan_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles(platform);

CREATE TABLE data_breaches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id             UUID NOT NULL REFERENCES osint_scans(id) ON DELETE CASCADE,
    breach_name         TEXT NOT NULL,
    breach_domain       TEXT,
    leak_date           DATE,
    exposed_data_classes TEXT[] NOT NULL,
    record_count        BIGINT,
    severity            TEXT NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    source_note         TEXT,
    discovered_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_data_breaches_scan_id ON data_breaches(scan_id);
CREATE INDEX idx_data_breaches_severity ON data_breaches(severity);
