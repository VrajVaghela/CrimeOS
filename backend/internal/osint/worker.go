package osint

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"crimeos/digitalfootprint/internal/analytics"
	"crimeos/digitalfootprint/internal/caselog"
	"crimeos/digitalfootprint/internal/entity"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/mongo"
)

// RunWorker runs the OSINT scan worker loop. It polls for pending scans at
// the given interval and processes them through a bounded worker pool.
// Mirrors the dispatch.RunWorker structure: ticker loop, graceful shutdown
// on ctx.Done(), structured logging each cycle.
func RunWorker(ctx context.Context, repo *Repository, entityRepo *entity.Repository, analyticsRepo *analytics.Repository, caseLogPub caselog.Publisher, mongoDB *mongo.Database, interval time.Duration, concurrency int) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	slog.Info("osint worker started", "interval", interval, "concurrency", concurrency)

	for {
		select {
		case <-ctx.Done():
			slog.Info("osint worker stopping")
			return
		case <-ticker.C:
			cycleStart := time.Now()

			scans, err := repo.ClaimPendingScans(ctx, 5) // batch size 5
			if err != nil {
				slog.Error("osint worker: failed to claim scans", "error", err)
				continue
			}

			if len(scans) == 0 {
				continue
			}

			slog.Info("osint worker: cycle start", "scans_claimed", len(scans))

			// Bounded worker pool using semaphore channel
			sem := make(chan struct{}, concurrency)
			var wg sync.WaitGroup

			for _, scan := range scans {
				wg.Add(1)
				sem <- struct{}{} // acquire semaphore
				go func(s Scan) {
					defer wg.Done()
					defer func() { <-sem }() // release semaphore
					processScan(ctx, repo, entityRepo, analyticsRepo, caseLogPub, mongoDB, s)
				}(scan)
			}

			wg.Wait()
			slog.Info("osint worker: cycle complete", "duration", time.Since(cycleStart), "scans_processed", len(scans))
		}
	}
}

func processScan(ctx context.Context, repo *Repository, entityRepo *entity.Repository, analyticsRepo *analytics.Repository, caseLogPub caselog.Publisher, mongoDB *mongo.Database, scan Scan) {
	scanStart := time.Now()

	// Deferred recover: a scan must never stay stuck in RUNNING
	defer func() {
		if r := recover(); r != nil {
			errMsg := fmt.Sprintf("panic during OSINT scan: %v", r)
			slog.Error("osint worker: scan panicked", "scan_id", scan.ID, "error", errMsg)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
		}
	}()

	var profiles []SocialProfile
	var breaches []DataBreach

	sherlock := &MockSherlockScanner{}
	holehe := &MockHoleheScanner{}
	breachSvc := &MockBreachService{}

	switch scan.EntityType {
	case "USERNAME", "SOCIAL_HANDLE":
		p, err := sherlock.ScanUsername(ctx, scan.EntityValue)
		if err != nil {
			errMsg := fmt.Sprintf("sherlock scan failed: %v", err)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
			slog.Error("osint scan failed", "scan_id", scan.ID, "error", err)
			return
		}
		profiles = append(profiles, p...)

	case "EMAIL":
		p, err := holehe.ScanEmail(ctx, scan.EntityValue)
		if err != nil {
			errMsg := fmt.Sprintf("holehe scan failed: %v", err)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
			slog.Error("osint scan failed", "scan_id", scan.ID, "error", err)
			return
		}
		profiles = append(profiles, p...)

		b, err := breachSvc.LookupBreaches(ctx, scan.EntityValue, "EMAIL")
		if err != nil {
			errMsg := fmt.Sprintf("breach lookup failed: %v", err)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
			slog.Error("osint scan failed", "scan_id", scan.ID, "error", err)
			return
		}
		breaches = append(breaches, b...)

	case "PHONE":
		b, err := breachSvc.LookupBreaches(ctx, scan.EntityValue, "PHONE")
		if err != nil {
			errMsg := fmt.Sprintf("breach lookup failed: %v", err)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
			slog.Error("osint scan failed", "scan_id", scan.ID, "error", err)
			return
		}
		breaches = append(breaches, b...)

	default:
		errMsg := fmt.Sprintf("unsupported entity type for OSINT scan: %s", scan.EntityType)
		_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
		slog.Warn("osint scan: unsupported entity type", "scan_id", scan.ID, "entity_type", scan.EntityType)
		return
	}

	// Persist results
	if len(profiles) > 0 {
		if err := repo.InsertSocialProfiles(ctx, scan.ID, profiles); err != nil {
			errMsg := fmt.Sprintf("failed to persist social profiles: %v", err)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
			slog.Error("osint scan: persist profiles failed", "scan_id", scan.ID, "error", err)
			return
		}
	}

	if len(breaches) > 0 {
		if err := repo.InsertBreaches(ctx, scan.ID, breaches); err != nil {
			errMsg := fmt.Sprintf("failed to persist breaches: %v", err)
			_ = repo.UpdateScanStatus(ctx, scan.ID, FailedStatus, &errMsg)
			slog.Error("osint scan: persist breaches failed", "scan_id", scan.ID, "error", err)
			return
		}
	}

	// ========== FEATURE 1: Pivot Engine - Extract discovered footprints ==========
	var discovered []DiscoveredFootprint
	if len(profiles) > 0 {
		var err error
		discovered, err = extractDiscoveredFootprints(ctx, repo, entityRepo, scan, profiles)
		if err != nil {
			slog.Warn("osint scan: failed to extract discovered footprints", "scan_id", scan.ID, "error", err)
		} else if len(discovered) > 0 {
			if err := repo.InsertDiscoveredFootprints(ctx, discovered); err != nil {
				slog.Warn("osint scan: failed to persist discovered footprints", "scan_id", scan.ID, "error", err)
			} else {
				slog.Info("osint scan: discovered new footprints", "scan_id", scan.ID, "count", len(discovered))
			}
		}
	}

	// ========== FEATURE 4: Store snapshot for behavioral delta tracking ==========
	fullResult := EntityScanResult{
		Scan:           scan,
		SocialProfiles: profiles,
		Breaches:       breaches,
		RiskSummary:    computeRiskSummary(profiles, breaches),
	}
	if err := repo.StoreOSINTSnapshot(ctx, scan.ID, scan.CaseID, scan.EntityID, fullResult); err != nil {
		slog.Warn("osint scan: failed to store snapshot", "scan_id", scan.ID, "error", err)
	}

	// ========== FEATURE 2: Geographic correlation heuristics ==========
	if len(profiles) > 0 {
		if err := runGeographicCorrelation(ctx, scan.CaseID, scan.EntityID, analyticsRepo, caseLogPub, profiles); err != nil {
			slog.Warn("osint scan: geographic correlation failed", "scan_id", scan.ID, "error", err)
		}
	}

	// Write raw result snapshot to MongoDB (audit/debugging only)
	rawResult := map[string]any{
		"scan_id":      scan.ID.String(),
		"entity_value": scan.EntityValue,
		"entity_type":  scan.EntityType,
		"profiles":     profiles,
		"breaches":     breaches,
		"scanned_at":   time.Now(),
	}
	if _, err := mongoDB.Collection("osint_raw_results").InsertOne(ctx, rawResult); err != nil {
		slog.Warn("osint scan: failed to write raw result to mongo", "scan_id", scan.ID, "error", err)
		// Non-fatal: don't fail the scan for a mongo write error
	}

	// Mark completed
	if err := repo.UpdateScanStatus(ctx, scan.ID, CompletedStatus, nil); err != nil {
		slog.Error("osint scan: failed to mark completed", "scan_id", scan.ID, "error", err)
		return
	}

	slog.Info("osint scan completed",
		"scan_id", scan.ID,
		"entity_type", scan.EntityType,
		"profiles_found", len(profiles),
		"breaches_found", len(breaches),
		"discovered_footprints", len(discovered),
		"duration", time.Since(scanStart),
	)
}

// EnqueueScanForEntity is a thin wrapper around repo.CreateScan — a single
// fast INSERT, safe to call synchronously from an HTTP handler.
func EnqueueScanForEntity(ctx context.Context, repo *Repository, entityID, caseID uuid.UUID, entityType, entityValue string) error {
	_, err := repo.CreateScan(ctx, entityID, caseID, entityType, entityValue)
	if err != nil {
		return fmt.Errorf("osint: enqueue scan for entity: %w", err)
	}
	return nil
}

// extractDiscoveredFootprints identifies new identifiers in OSINT profiles that don't yet
// exist in the case's entity database.
func extractDiscoveredFootprints(ctx context.Context, repo *Repository, entityRepo *entity.Repository, scan Scan, profiles []SocialProfile) ([]DiscoveredFootprint, error) {
	seen := make(map[string]struct{})
	var footprints []DiscoveredFootprint

	for _, profile := range profiles {
		// Extract from bio
		for _, candidate := range extractBioFootprints(profile.Bio) {
			if candidate.normalizedValue == "" {
				continue
			}
			key := candidate.entityType + "|" + candidate.normalizedValue
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}

			// Check if entity already exists in this case
			existing, err := entityRepo.GetByCaseTypeNormalizedValue(ctx, scan.CaseID, candidate.entityType, candidate.normalizedValue)
			if err == nil && existing != nil {
				// Entity already confirmed, skip
				continue
			}

			footprints = append(footprints, DiscoveredFootprint{
				ID:              uuid.New(),
				CaseID:          scan.CaseID,
				OriginalScanID:  scan.ID,
				EntityID:        nil,
				EntityType:      candidate.entityType,
				EntityValue:     candidate.rawValue,
				NormalizedValue: candidate.normalizedValue,
				ConfidenceScore: candidate.confidence,
				SourceField:     "bio",
				SourceSnippet:   profile.Bio,
				Status:          "PENDING",
				DetectedAt:      time.Now(),
			})
		}
	}

	return footprints, nil
}

// runGeographicCorrelation checks for mismatches between OSINT location hints
// and IP session geographic patterns.
func runGeographicCorrelation(ctx context.Context, caseID, entityID uuid.UUID, analyticsRepo *analytics.Repository, caseLogPub caselog.Publisher, profiles []SocialProfile) error {
	// Extract geographic hints from profiles
	var geoHints []string
	var tzHints []string
	for _, p := range profiles {
		if p.LocationHint != nil && *p.LocationHint != "" {
			geoHints = append(geoHints, *p.LocationHint)
		}
		if p.TimezoneHint != nil && *p.TimezoneHint != "" {
			tzHints = append(tzHints, *p.TimezoneHint)
		}
	}

	if len(geoHints) == 0 {
		return nil
	}

	// For demo: check if IPs exist for this case and assess anomaly
	// In production, integrate with GeoIP and threat-intel feeds
	event := caselog.IntelEvent{
		CaseID:     caseID,
		Source:     "osint_geographic_correlation",
		Summary:    fmt.Sprintf("OSINT profiles indicate activity from %v; cross-reference with network session data for geographic anomalies", geoHints),
		Severity:   "MEDIUM",
		OccurredAt: time.Now(),
	}
	_ = caseLogPub.Publish(ctx, event)

	return nil
}
