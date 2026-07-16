package osint

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrScanNotFound is returned when no scan exists for the given entity.
var ErrScanNotFound = errors.New("osint: scan not found")

// Repository provides data access for OSINT scan results.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository creates a new OSINT repository.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateScan inserts a new PENDING scan row and returns the created row.
func (r *Repository) CreateScan(ctx context.Context, entityID, caseID uuid.UUID, entityType, entityValue string) (Scan, error) {
	var s Scan
	err := r.pool.QueryRow(ctx, `
		INSERT INTO osint_scans (case_id, entity_id, entity_type, entity_value)
		VALUES ($1, $2, $3, $4)
		RETURNING id, case_id, entity_id, entity_type, entity_value, status,
		          started_at, completed_at, error_message, created_at, updated_at
	`, caseID, entityID, entityType, entityValue).Scan(
		&s.ID, &s.CaseID, &s.EntityID, &s.EntityType, &s.EntityValue, &s.Status,
		&s.StartedAt, &s.CompletedAt, &s.ErrorMessage, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return Scan{}, fmt.Errorf("osint: create scan: %w", err)
	}
	return s, nil
}

// UpdateScanStatus updates the status of a scan and sets started_at/completed_at
// as appropriate for the transition.
func (r *Repository) UpdateScanStatus(ctx context.Context, scanID uuid.UUID, status ScanStatus, errMsg *string) error {
	var startedAt, completedAt *time.Time
	now := time.Now()

	switch status {
	case RunningStatus:
		startedAt = &now
	case CompletedStatus, FailedStatus:
		completedAt = &now
	}

	_, err := r.pool.Exec(ctx, `
		UPDATE osint_scans
		SET status = $1,
		    started_at = COALESCE($2, started_at),
		    completed_at = COALESCE($3, completed_at),
		    error_message = $4,
		    updated_at = NOW()
		WHERE id = $5
	`, status, startedAt, completedAt, errMsg, scanID)
	if err != nil {
		return fmt.Errorf("osint: update scan status: %w", err)
	}
	return nil
}

// InsertSocialProfiles batch-inserts social profile rows for a scan.
func (r *Repository) InsertSocialProfiles(ctx context.Context, scanID uuid.UUID, profiles []SocialProfile) error {
	if len(profiles) == 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("osint: insert social profiles: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, p := range profiles {
		_, err := tx.Exec(ctx, `
			INSERT INTO social_profiles (
				scan_id, platform, username, profile_url,
				profile_picture_url, bio, location_hint, timezone_hint,
				follower_count, is_verified, exists_confidence)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, scanID, p.Platform, p.Username, p.ProfileURL,
			p.ProfilePictureURL, p.Bio, p.LocationHint, p.TimezoneHint,
			p.FollowerCount, p.IsVerified, p.ExistsConfidence)
		if err != nil {
			return fmt.Errorf("osint: insert social profile: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("osint: insert social profiles: commit: %w", err)
	}
	return nil
}

// InsertBreaches batch-inserts data breach rows for a scan.
func (r *Repository) InsertBreaches(ctx context.Context, scanID uuid.UUID, breaches []DataBreach) error {
	if len(breaches) == 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("osint: insert breaches: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, b := range breaches {
		_, err := tx.Exec(ctx, `
			INSERT INTO data_breaches (scan_id, breach_name, breach_domain, leak_date,
			            exposed_data_classes, record_count, severity, source_note)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, scanID, b.BreachName, b.BreachDomain, b.LeakDate,
			b.ExposedDataClasses, b.RecordCount, b.Severity, b.SourceNote)
		if err != nil {
			return fmt.Errorf("osint: insert breach: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("osint: insert breaches: commit: %w", err)
	}
	return nil
}

// InsertDiscoveredFootprints persists discovered identifiers that do not yet exist in the case.
func (r *Repository) InsertDiscoveredFootprints(ctx context.Context, footprints []DiscoveredFootprint) error {
	if len(footprints) == 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("osint: insert discovered footprints: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, f := range footprints {
		_, err := tx.Exec(ctx, `
			INSERT INTO unconfirmed_discovered_entities (
				case_id, original_scan_id, entity_id, entity_type, entity_value,
				normalized_value, confidence_score, source_field, source_snippet,
				status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, f.CaseID, f.OriginalScanID, f.EntityID, f.EntityType, f.EntityValue,
			f.NormalizedValue, f.ConfidenceScore, f.SourceField, f.SourceSnippet, f.Status)
		if err != nil {
			return fmt.Errorf("osint: insert discovered footprint: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("osint: insert discovered footprints: commit: %w", err)
	}
	return nil
}

func (r *Repository) GetDiscoveredFootprintsForScan(ctx context.Context, scanID uuid.UUID) ([]DiscoveredFootprint, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, case_id, original_scan_id, entity_id, entity_type, entity_value,
		       normalized_value, confidence_score, source_field, source_snippet,
		       status, detected_at
		FROM unconfirmed_discovered_entities
		WHERE original_scan_id = $1
		ORDER BY detected_at ASC
	`, scanID)
	if err != nil {
		return nil, fmt.Errorf("osint: get discovered footprints: %w", err)
	}
	defer rows.Close()

	var footprints []DiscoveredFootprint
	for rows.Next() {
		var f DiscoveredFootprint
		if err := rows.Scan(
			&f.ID, &f.CaseID, &f.OriginalScanID, &f.EntityID, &f.EntityType, &f.EntityValue,
			&f.NormalizedValue, &f.ConfidenceScore, &f.SourceField, &f.SourceSnippet,
			&f.Status, &f.DetectedAt,
		); err != nil {
			return nil, fmt.Errorf("osint: scan discovered footprint: %w", err)
		}
		footprints = append(footprints, f)
	}
	return footprints, nil
}

func (r *Repository) StoreOSINTSnapshot(ctx context.Context, scanID, caseID, entityID uuid.UUID, result EntityScanResult) error {
	payload, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("osint: marshal snapshot: %w", err)
	}

	_, err = r.pool.Exec(ctx, `
		INSERT INTO osint_snapshots (scan_id, case_id, entity_id, snapshot_data)
		VALUES ($1, $2, $3, $4)
	`, scanID, caseID, entityID, payload)
	if err != nil {
		return fmt.Errorf("osint: insert snapshot: %w", err)
	}
	return nil
}

func (r *Repository) GetPreviousSnapshotProfiles(ctx context.Context, entityID uuid.UUID, latestCreatedAt time.Time) ([]SocialProfile, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT snapshot_data
		FROM osint_snapshots
		WHERE entity_id = $1 AND created_at < $2
		ORDER BY created_at DESC
		LIMIT 1
	`, entityID, latestCreatedAt)

	var raw []byte
	if err := row.Scan(&raw); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("osint: get previous snapshot profiles: %w", err)
	}

	var prev EntityScanResult
	if err := json.Unmarshal(raw, &prev); err != nil {
		return nil, fmt.Errorf("osint: unmarshal previous snapshot: %w", err)
	}
	return prev.SocialProfiles, nil
}

// GetLatestScanForEntity returns the most recent scan for a given entity.
func (r *Repository) GetLatestScanForEntity(ctx context.Context, entityID uuid.UUID) (Scan, error) {
	var s Scan
	err := r.pool.QueryRow(ctx, `
		SELECT id, case_id, entity_id, entity_type, entity_value, status,
		       started_at, completed_at, error_message, created_at, updated_at
		FROM osint_scans
		WHERE entity_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`, entityID).Scan(
		&s.ID, &s.CaseID, &s.EntityID, &s.EntityType, &s.EntityValue, &s.Status,
		&s.StartedAt, &s.CompletedAt, &s.ErrorMessage, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Scan{}, ErrScanNotFound
		}
		return Scan{}, fmt.Errorf("osint: get latest scan for entity: %w", err)
	}
	return s, nil
}

// GetFullResult fetches the latest scan for an entity together with its
// social profiles, breaches, and a computed risk summary.
func (r *Repository) GetFullResult(ctx context.Context, entityID uuid.UUID) (EntityScanResult, error) {
	scan, err := r.GetLatestScanForEntity(ctx, entityID)
	if err != nil {
		return EntityScanResult{}, err
	}

	// Fetch social profiles
	rows, err := r.pool.Query(ctx, `
		SELECT id, scan_id, platform, username, profile_url, profile_picture_url,
		       bio, location_hint, timezone_hint, follower_count, is_verified, exists_confidence, discovered_at
		FROM social_profiles
		WHERE scan_id = $1
		ORDER BY discovered_at ASC
	`, scan.ID)
	if err != nil {
		return EntityScanResult{}, fmt.Errorf("osint: get social profiles: %w", err)
	}
	defer rows.Close()

	var profiles []SocialProfile
	for rows.Next() {
		var p SocialProfile
		if err := rows.Scan(
			&p.ID, &p.ScanID, &p.Platform, &p.Username, &p.ProfileURL,
			&p.ProfilePictureURL, &p.Bio, &p.LocationHint, &p.TimezoneHint, &p.FollowerCount, &p.IsVerified,
			&p.ExistsConfidence, &p.DiscoveredAt,
		); err != nil {
			return EntityScanResult{}, fmt.Errorf("osint: scan social profile row: %w", err)
		}
		profiles = append(profiles, p)
	}

	// Fetch breaches
	brows, err := r.pool.Query(ctx, `
		SELECT id, scan_id, breach_name, breach_domain, leak_date,
		       exposed_data_classes, record_count, severity, source_note, discovered_at
		FROM data_breaches
		WHERE scan_id = $1
		ORDER BY discovered_at ASC
	`, scan.ID)
	if err != nil {
		return EntityScanResult{}, fmt.Errorf("osint: get breaches: %w", err)
	}
	defer brows.Close()

	var breaches []DataBreach
	for brows.Next() {
		var b DataBreach
		if err := brows.Scan(
			&b.ID, &b.ScanID, &b.BreachName, &b.BreachDomain, &b.LeakDate,
			&b.ExposedDataClasses, &b.RecordCount, &b.Severity, &b.SourceNote,
			&b.DiscoveredAt,
		); err != nil {
			return EntityScanResult{}, fmt.Errorf("osint: scan breach row: %w", err)
		}
		breaches = append(breaches, b)
	}

	if profiles == nil {
		profiles = []SocialProfile{}
	}
	if breaches == nil {
		breaches = []DataBreach{}
	}

	previousProfiles, err := r.GetPreviousSnapshotProfiles(ctx, scan.EntityID, scan.CreatedAt)
	if err != nil {
		return EntityScanResult{}, fmt.Errorf("osint: get previous snapshot profiles: %w", err)
	}
	profiles = applyProfileDeltas(profiles, previousProfiles)

	footprints, err := r.GetDiscoveredFootprintsForScan(ctx, scan.ID)
	if err != nil {
		return EntityScanResult{}, fmt.Errorf("osint: get discovered footprints: %w", err)
	}

	// Compute risk summary
	summary := computeRiskSummary(profiles, breaches)

	return EntityScanResult{
		Scan:                scan,
		SocialProfiles:      profiles,
		Breaches:            breaches,
		RiskSummary:         summary,
		DiscoveredFootprints: footprints,
	}, nil
}

func applyProfileDeltas(current, previous []SocialProfile) []SocialProfile {
	if len(previous) == 0 {
		return current
	}

	previousByKey := make(map[string]SocialProfile)
	for _, profile := range previous {
		key := profile.Platform + "|" + profile.Username
		previousByKey[key] = profile
	}

	for i, profile := range current {
		key := profile.Platform + "|" + profile.Username
		if prior, ok := previousByKey[key]; ok {
			if profile.FollowerCount != nil && prior.FollowerCount != nil {
				delta := *profile.FollowerCount - *prior.FollowerCount
				if delta != 0 {
					current[i].FollowerCountDelta = &delta
				}
			}
			if profile.Bio != nil && prior.Bio != nil && *profile.Bio != *prior.Bio {
				current[i].BioChanged = true
			}
			if profile.LocationHint != nil && prior.LocationHint != nil && *profile.LocationHint != *prior.LocationHint {
				current[i].LocationChanged = true
			}
			if profile.LocationHint != nil && prior.LocationHint == nil {
				current[i].LocationChanged = true
			}
			if profile.LocationHint == nil && prior.LocationHint != nil {
				current[i].LocationChanged = true
			}
		}
	}

	return current
}

func computeRiskSummary(profiles []SocialProfile, breaches []DataBreach) RiskSummary {
	totalBreaches := len(breaches)
	criticalBreaches := 0
	hasCritical := false
	hasHigh := false
	hasMedium := false

	for _, b := range breaches {
		switch b.Severity {
		case "CRITICAL":
			criticalBreaches++
			hasCritical = true
		case "HIGH":
			hasHigh = true
		case "MEDIUM":
			hasMedium = true
		}
	}

	overall := "LOW"
	if hasCritical {
		overall = "CRITICAL"
	} else if hasHigh {
		overall = "HIGH"
	} else if hasMedium || len(profiles) >= 3 {
		overall = "MEDIUM"
	}

	return RiskSummary{
		TotalBreaches:    totalBreaches,
		CriticalBreaches: criticalBreaches,
		PlatformsFound:   len(profiles),
		OverallRiskLevel: overall,
	}
}

// ClaimPendingScans atomically claims up to `limit` PENDING scans using
// SELECT ... FOR UPDATE SKIP LOCKED, transitions them to RUNNING, and
// returns the claimed rows.
func (r *Repository) ClaimPendingScans(ctx context.Context, limit int) ([]Scan, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("osint: claim pending scans: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, case_id, entity_id, entity_type, entity_value, status,
		       started_at, completed_at, error_message, created_at, updated_at
		FROM osint_scans
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("osint: claim pending scans: query: %w", err)
	}
	defer rows.Close()

	var scans []Scan
	for rows.Next() {
		var s Scan
		if err := rows.Scan(
			&s.ID, &s.CaseID, &s.EntityID, &s.EntityType, &s.EntityValue, &s.Status,
			&s.StartedAt, &s.CompletedAt, &s.ErrorMessage, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("osint: claim pending scans: scan row: %w", err)
		}
		scans = append(scans, s)
	}

	now := time.Now()
	for i := range scans {
		_, err := tx.Exec(ctx, `
			UPDATE osint_scans
			SET status = 'RUNNING', started_at = $1, updated_at = NOW()
			WHERE id = $2
		`, now, scans[i].ID)
		if err != nil {
			return nil, fmt.Errorf("osint: claim pending scans: update: %w", err)
		}
		scans[i].Status = RunningStatus
		scans[i].StartedAt = &now
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("osint: claim pending scans: commit: %w", err)
	}

	return scans, nil
}
