// Package osint implements the OSINT & Breach Intelligence module for
// CrimeOS Digital Footprint. It provides simulated Sherlock-style username
// enumeration, Holehe-style email-registration checks, and HaveIBeenPwned-style
// breach-database lookups against confirmed digital entities.
//
// Scan execution (scanners and the background worker) lives in separate files
// within this package (sherlock.go, holehe.go, breach.go, worker.go).
package osint

import (
	"time"

	"github.com/google/uuid"
)

// ScanStatus represents the lifecycle state of an OSINT scan job.
type ScanStatus string

const (
	PendingStatus   ScanStatus = "PENDING"
	RunningStatus   ScanStatus = "RUNNING"
	CompletedStatus ScanStatus = "COMPLETED"
	FailedStatus    ScanStatus = "FAILED"
)

// Scan mirrors the osint_scans table.
type Scan struct {
	ID           uuid.UUID  `json:"id"`
	CaseID       uuid.UUID  `json:"case_id"`
	EntityID     uuid.UUID  `json:"entity_id"`
	EntityType   string     `json:"entity_type"`
	EntityValue  string     `json:"entity_value"`
	Status       ScanStatus `json:"status"`
	StartedAt    *time.Time `json:"started_at,omitempty"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	ErrorMessage *string    `json:"error_message,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// SocialProfile mirrors the social_profiles table.
type SocialProfile struct {
	ID                 uuid.UUID `json:"id"`
	ScanID             uuid.UUID `json:"scan_id"`
	Platform           string    `json:"platform"`
	Username           string    `json:"username"`
	ProfileURL         string    `json:"profile_url"`
	ProfilePictureURL  *string   `json:"profile_picture_url,omitempty"`
	Bio                *string   `json:"bio,omitempty"`
	LocationHint       *string   `json:"location_hint,omitempty"`
	TimezoneHint       *string   `json:"timezone_hint,omitempty"`
	FollowerCount      *int      `json:"follower_count,omitempty"`
	FollowerCountDelta *int      `json:"follower_count_delta,omitempty"`
	BioChanged         bool      `json:"bio_changed,omitempty"`
	LocationChanged    bool      `json:"location_changed,omitempty"`
	IsVerified         bool      `json:"is_verified"`
	ExistsConfidence   string    `json:"exists_confidence"`
	DiscoveredAt       time.Time `json:"discovered_at"`
}

// DiscoveredFootprint is an OSINT-derived identifier that may be used to pivot
// investigation into a new case entity.
type DiscoveredFootprint struct {
	ID              uuid.UUID `json:"id"`
	CaseID          uuid.UUID `json:"case_id"`
	OriginalScanID  uuid.UUID `json:"original_scan_id"`
	EntityID        *uuid.UUID `json:"entity_id,omitempty"`
	EntityType      string    `json:"entity_type"`
	EntityValue     string    `json:"entity_value"`
	NormalizedValue string    `json:"normalized_value"`
	ConfidenceScore float64   `json:"confidence_score"`
	SourceField     string    `json:"source_field"`
	SourceSnippet   *string   `json:"source_snippet,omitempty"`
	Status          string    `json:"status"`
	DetectedAt      time.Time `json:"detected_at"`
}

// DataBreach mirrors the data_breaches table.
type DataBreach struct {
	ID                 uuid.UUID `json:"id"`
	ScanID             uuid.UUID `json:"scan_id"`
	BreachName         string    `json:"breach_name"`
	BreachDomain       *string   `json:"breach_domain,omitempty"`
	LeakDate           *string   `json:"leak_date,omitempty"` // DATE as string (YYYY-MM-DD)
	ExposedDataClasses []string  `json:"exposed_data_classes"`
	RecordCount        *int64    `json:"record_count,omitempty"`
	Severity           string    `json:"severity"`
	SourceNote         *string   `json:"source_note,omitempty"`
	DiscoveredAt       time.Time `json:"discovered_at"`
}

// EntityScanResult is the aggregate response shape returned by the API.
type EntityScanResult struct {
	Scan           Scan            `json:"scan"`
	SocialProfiles []SocialProfile `json:"social_profiles"`
	Breaches       []DataBreach    `json:"breaches"`
	RiskSummary    RiskSummary     `json:"risk_summary"`
}

// RiskSummary provides computed risk metrics for an OSINT scan.
type RiskSummary struct {
	TotalBreaches    int    `json:"total_breaches"`
	CriticalBreaches int    `json:"critical_breaches"`
	PlatformsFound   int    `json:"platforms_found"`
	OverallRiskLevel string `json:"overall_risk_level"` // CRITICAL/HIGH/MEDIUM/LOW
}
