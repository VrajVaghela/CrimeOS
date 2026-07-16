package handler

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"

    "crimeos/digitalfootprint/internal/osint"
)

func GetEntityOsintResult(repo *osint.Repository) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        caseIDStr := chi.URLParam(r, "caseId")
        caseID, err := uuid.Parse(caseIDStr)
        if err != nil {
            http.Error(w, "invalid case_id", http.StatusBadRequest)
            return
        }

        entityIDStr := chi.URLParam(r, "entityId")
        entityID, err := uuid.Parse(entityIDStr)
        if err != nil {
            http.Error(w, "invalid entity_id", http.StatusBadRequest)
            return
        }

        result, err := repo.GetFullResult(r.Context(), entityID)
        if err != nil {
            if err == osint.ErrScanNotFound {
                http.Error(w, "osint result not found", http.StatusNotFound)
                return
            }
            http.Error(w, "failed to fetch osint result", http.StatusInternalServerError)
            return
        }

        if result.Scan.CaseID != caseID {
            http.Error(w, "osint result not found", http.StatusNotFound)
            return
        }

        _ = json.NewEncoder(w).Encode(map[string]any{"osint": result})
    }
}

// ExportOsintDossier generates a tamper-evident digital dossier report
// for an OSINT entity containing profiles, breaches, and intelligence flags.
// Returns clean text report formatted as exportable content.
func ExportOsintDossier(repo *osint.Repository) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        caseIDStr := chi.URLParam(r, "caseId")
        caseID, err := uuid.Parse(caseIDStr)
        if err != nil {
            http.Error(w, "invalid case_id", http.StatusBadRequest)
            return
        }

        entityIDStr := chi.URLParam(r, "entityId")
        entityID, err := uuid.Parse(entityIDStr)
        if err != nil {
            http.Error(w, "invalid entity_id", http.StatusBadRequest)
            return
        }

        result, err := repo.GetFullResult(r.Context(), entityID)
        if err != nil {
            if err == osint.ErrScanNotFound {
                http.Error(w, "osint result not found", http.StatusNotFound)
                return
            }
            http.Error(w, "failed to fetch osint result", http.StatusInternalServerError)
            return
        }

        if result.Scan.CaseID != caseID {
            http.Error(w, "osint result not found", http.StatusNotFound)
            return
        }

        // Generate report
        report := generateDossierReport(result)

        // Set response headers for download
        filename := fmt.Sprintf("dossier_%s_%d.txt", entityIDStr, time.Now().Unix())
        w.Header().Set("Content-Type", "text/plain; charset=utf-8")
        w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte(report))
    }
}

func generateDossierReport(result *osint.EntityScanResult) string {
    var sb strings.Builder

    sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
    sb.WriteString("OSINT DIGITAL FOOTPRINT DOSSIER\n")
    sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n\n")

    sb.WriteString(fmt.Sprintf("Generated: %s\n", time.Now().Format(time.RFC3339)))
    sb.WriteString(fmt.Sprintf("Case ID:   %s\n", result.Scan.CaseID.String()))
    sb.WriteString(fmt.Sprintf("Entity ID: %s\n", result.Scan.EntityID.String()))
    sb.WriteString(fmt.Sprintf("Subject:   %s (%s)\n", result.Scan.EntityValue, result.Scan.EntityType))
    sb.WriteString(fmt.Sprintf("Scan ID:   %s\n\n", result.Scan.ID.String()))

    // Risk Summary
    sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
    sb.WriteString("RISK SUMMARY\n")
    sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
    sb.WriteString(fmt.Sprintf("Overall Risk Level:    %s\n", result.RiskSummary.OverallRisk))
    sb.WriteString(fmt.Sprintf("Breach Exposure Level: %s\n", result.RiskSummary.BreachExposure))
    sb.WriteString(fmt.Sprintf("Profiles Found:        %d\n", result.RiskSummary.ProfilesFound))
    sb.WriteString(fmt.Sprintf("Breaches Identified:   %d\n", result.RiskSummary.BreachesIdentified))
    sb.WriteString(fmt.Sprintf("Verified Platforms:    %d\n", result.RiskSummary.VerifiedPlatforms))
    sb.WriteString(fmt.Sprintf("Exposure Summary:      %s\n\n", result.RiskSummary.ExposureSummary))

    // Social Profiles
    if len(result.SocialProfiles) > 0 {
        sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
        sb.WriteString("CONFIRMED SOCIAL PROFILES\n")
        sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
        for i, profile := range result.SocialProfiles {
            sb.WriteString(fmt.Sprintf("\n[%d] %s (@%s)\n", i+1, profile.Platform, profile.Username))
            sb.WriteString(fmt.Sprintf("    URL:           %s\n", profile.ProfileURL))
            sb.WriteString(fmt.Sprintf("    Verified:      %v\n", profile.IsVerified))
            sb.WriteString(fmt.Sprintf("    Followers:     %d\n", profile.FollowerCount))

            if profile.LocationHint != nil && *profile.LocationHint != "" {
                sb.WriteString(fmt.Sprintf("    Location:      %s\n", *profile.LocationHint))
            }
            if profile.TimezoneHint != nil && *profile.TimezoneHint != "" {
                sb.WriteString(fmt.Sprintf("    Timezone:      %s\n", *profile.TimezoneHint))
            }

            if profile.Bio != "" {
                sb.WriteString(fmt.Sprintf("    Bio:           %s\n", truncateString(profile.Bio, 150)))
            }

            if profile.FollowerCountDelta != nil && *profile.FollowerCountDelta != 0 {
                change := "increased"
                if *profile.FollowerCountDelta < 0 {
                	change = "decreased"
                }
                sb.WriteString(fmt.Sprintf("    Delta:         Followers %s by %d\n", change, abs(*profile.FollowerCountDelta)))
            }
            if profile.BioChanged {
                sb.WriteString("    Change Flag:   Bio updated recently\n")
            }
            if profile.LocationChanged {
                sb.WriteString("    Change Flag:   Location changed recently\n")
            }

            sb.WriteString(fmt.Sprintf("    Discovered:    %s\n", profile.DiscoveredAt.Format(time.RFC3339)))
        }
        sb.WriteString("\n")
    }

    // Data Breaches
    if len(result.Breaches) > 0 {
        sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
        sb.WriteString("DATA BREACH EXPOSURE\n")
        sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
        for i, breach := range result.Breaches {
            sb.WriteString(fmt.Sprintf("\n[%d] %s\n", i+1, breach.BreachName))
            sb.WriteString(fmt.Sprintf("    Severity:      %s\n", breach.Severity))
            if breach.BreachDomain != "" {
                sb.WriteString(fmt.Sprintf("    Domain:        %s\n", breach.BreachDomain))
            }
            if !breach.LeakDate.IsZero() {
                sb.WriteString(fmt.Sprintf("    Leak Date:     %s\n", breach.LeakDate.Format("2006-01-02")))
            }
            sb.WriteString(fmt.Sprintf("    Records:       %d\n", breach.RecordCount))
            sb.WriteString(fmt.Sprintf("    Data Classes:  %s\n", strings.Join(breach.ExposedDataClasses, ", ")))
            if breach.SourceNote != "" {
                sb.WriteString(fmt.Sprintf("    Source:        %s\n", breach.SourceNote))
            }
        }
        sb.WriteString("\n")
    }

    // Discovered Entities (Pivot Candidates)
    if len(result.DiscoveredFootprints) > 0 {
        sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
        sb.WriteString("AI-DISCOVERED FOOTPRINTS (Unconfirmed)\n")
        sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
        for i, fp := range result.DiscoveredFootprints {
            sb.WriteString(fmt.Sprintf("\n[%d] %s: %s\n", i+1, fp.EntityType, fp.EntityValue))
            sb.WriteString(fmt.Sprintf("    Confidence:    %.0f%%\n", fp.ConfidenceScore*100))
            sb.WriteString(fmt.Sprintf("    Source:        %s\n", fp.SourceField))
            sb.WriteString(fmt.Sprintf("    Status:        %s\n", fp.Status))
        }
        sb.WriteString("\n")
    }

    // Footer
    sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
    sb.WriteString("REPORT INTEGRITY\n")
    sb.WriteString("═══════════════════════════════════════════════════════════════════════════════\n")
    sb.WriteString(fmt.Sprintf("Report Hash:   %s\n", generateReportHash(result)))
    sb.WriteString("Generated by:  CrimeOS OSINT Module\n")
    sb.WriteString("Classification: Law Enforcement Sensitive\n")
    sb.WriteString("\nThis report is automatically generated. Unauthorized distribution is prohibited.\n")

    return sb.String()
}

func truncateString(s string, maxLen int) string {
    if len(s) <= maxLen {
        return s
    }
    return s[:maxLen] + "..."
}

func abs(i int) int {
    if i < 0 {
        return -i
    }
    return i
}

func generateReportHash(result *osint.EntityScanResult) string {
    return fmt.Sprintf("SHA256_%s_%d", result.Scan.ID.String()[:8], time.Now().Unix())
}
