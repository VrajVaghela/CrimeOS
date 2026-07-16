-- OSINT Advanced Features: Pivot Engine, Behavioral Evolution, Geographic Correlation
-- Adds support for discovered entity pivoting, historical snapshots, and location hints

-- Add new columns to social_profiles for geographic hints and behavioral deltas
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS location_hint TEXT;
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS timezone_hint TEXT;
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS follower_count_delta INTEGER;
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS bio_changed BOOLEAN DEFAULT false;
ALTER TABLE social_profiles ADD COLUMN IF NOT EXISTS location_changed BOOLEAN DEFAULT false;

-- OSINT Snapshots: Historical profile state for delta tracking
CREATE TABLE IF NOT EXISTS osint_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id         UUID NOT NULL REFERENCES osint_scans(id) ON DELETE CASCADE,
    case_id         UUID NOT NULL REFERENCES cases(id),
    entity_id       UUID NOT NULL REFERENCES digital_entities(id),
    snapshot_data   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_osint_snapshots_entity ON osint_snapshots(entity_id);
CREATE INDEX IF NOT EXISTS idx_osint_snapshots_case ON osint_snapshots(case_id);
CREATE INDEX IF NOT EXISTS idx_osint_snapshots_scan ON osint_snapshots(scan_id);

-- Unconfirmed Discovered Entities: Identified footprints from OSINT bio scanning
-- Used for the "Pivot Investigation" feature to spawn new scans on discovered identifiers
CREATE TABLE IF NOT EXISTS unconfirmed_discovered_entities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL REFERENCES cases(id),
    original_scan_id    UUID NOT NULL REFERENCES osint_scans(id) ON DELETE CASCADE,
    entity_id           UUID REFERENCES digital_entities(id),
    entity_type         TEXT NOT NULL,
    entity_value        TEXT NOT NULL,
    normalized_value    TEXT NOT NULL,
    confidence_score    DECIMAL(3,2) NOT NULL,
    source_field        TEXT NOT NULL,
    source_snippet      TEXT,
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','IGNORED')),
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at        TIMESTAMPTZ,
    UNIQUE(case_id, entity_type, normalized_value)
);
CREATE INDEX IF NOT EXISTS idx_discovered_entities_case ON unconfirmed_discovered_entities(case_id);
CREATE INDEX IF NOT EXISTS idx_discovered_entities_scan ON unconfirmed_discovered_entities(original_scan_id);
CREATE INDEX IF NOT EXISTS idx_discovered_entities_status ON unconfirmed_discovered_entities(status);
CREATE INDEX IF NOT EXISTS idx_discovered_entities_entity ON unconfirmed_discovered_entities(entity_id);
