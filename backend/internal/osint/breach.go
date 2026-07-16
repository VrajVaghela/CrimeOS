// breach.go — MOCK implementation of HaveIBeenPwned-style breach database lookups.
//
// This file defines the BreachLookupService interface and provides a
// deterministic mock implementation (MockBreachService) that generates
// simulated breach data using FNV hashing for reproducibility.
//
// SWAP POINT: To integrate a real HIBP-style provider, implement the
// BreachLookupService interface and inject it into the worker.
//
// All breach names/data are FICTIONALIZED — do not use real HaveIBeenPwned
// breach names to avoid implying this is real HIBP data.
package osint

import (
	"context"
	"hash/fnv"

	"github.com/google/uuid"
)

// BreachLookupService checks whether an identifier appears in known data
// breaches.
type BreachLookupService interface {
	LookupBreaches(ctx context.Context, identifier, identifierType string) ([]DataBreach, error)
}

// seedBreach defines a fictionalized breach entry for the mock seed table.
type seedBreach struct {
	Name               string
	Domain             string
	LeakDate           string
	ExposedDataClasses []string
	RecordCount        int64
	SourceNote         string
}

var seedBreaches = []seedBreach{
	{"DataVault Leak 2021", "datavault.example.com", "2021-03-15", []string{"Emails", "Passwords", "Financial Credentials"}, 4200000, "Credential dump found on paste site"},
	{"ShopSphere Exposure 2020", "shopsphere.example.com", "2020-11-02", []string{"Emails", "Passwords", "Physical Address"}, 12500000, "E-commerce platform database breach"},
	{"HealthNet Breach 2022", "healthnet.example.org", "2022-06-18", []string{"Emails", "Phone Numbers", "Government ID", "Passwords"}, 890000, "Healthcare records exposed via misconfigured API"},
	{"SocialLink Dump 2019", "sociallink.example.net", "2019-08-22", []string{"Emails", "Dates of Birth", "IP Addresses"}, 35000000, "Social networking site scraped data"},
	{"PayStream Incident 2023", "paystream.example.com", "2023-01-09", []string{"Emails", "Financial Credentials", "Phone Numbers"}, 2100000, "Payment processor insider breach"},
	{"EduPortal Leak 2020", "eduportal.example.edu", "2020-04-30", []string{"Emails", "Passwords"}, 5600000, "University portal credential leak"},
	{"GameZone Hack 2021", "gamezone.example.com", "2021-12-01", []string{"Emails", "Passwords", "IP Addresses"}, 18000000, "Gaming platform database compromise"},
	{"TravelBuddy Breach 2022", "travelbuddy.example.com", "2022-09-14", []string{"Emails", "Phone Numbers", "Physical Address"}, 3400000, "Travel booking platform data leak"},
	{"CloudDrive Exposure 2023", "clouddrive.example.io", "2023-07-20", []string{"Emails", "IP Addresses"}, 7800000, "Cloud storage metadata exposure"},
	{"ForumTalk Dump 2018", "forumtalk.example.com", "2018-05-11", []string{"Emails", "Passwords"}, 1200000, "Forum database dump posted online"},
	{"MedSupply Leak 2021", "medsupply.example.com", "2021-10-05", []string{"Emails", "Physical Address", "Government ID"}, 450000, "Medical supply vendor data leak"},
	{"FinTrack Breach 2022", "fintrack.example.com", "2022-03-28", []string{"Emails", "Financial Credentials", "Passwords"}, 890000, "Financial tracking app API breach"},
	{"ChatWave Hack 2020", "chatwave.example.com", "2020-07-19", []string{"Emails", "Phone Numbers"}, 22000000, "Messaging platform server compromise"},
	{"JobHunt Exposure 2023", "jobhunt.example.com", "2023-11-03", []string{"Emails", "Dates of Birth"}, 6700000, "Job portal candidate data exposure"},
}

// MockBreachService is a deterministic mock that simulates HaveIBeenPwned-style
// breach lookups using FNV hashing to select a reproducible subset of
// fictionalized breaches per identifier.
type MockBreachService struct{}

func (m *MockBreachService) LookupBreaches(ctx context.Context, identifier, identifierType string) ([]DataBreach, error) {
	var breaches []DataBreach

	for _, seed := range seedBreaches {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		h := fnv.New64a()
		h.Write([]byte(identifier + ":breach:" + seed.Name))
		hv := h.Sum64()

		// ~40% chance the identifier appears in each breach
		if hv%10 >= 4 {
			continue
		}

		domain := seed.Domain
		leakDate := seed.LeakDate
		recordCount := seed.RecordCount
		sourceNote := seed.SourceNote

		breaches = append(breaches, DataBreach{
			ID:                 uuid.Nil,
			BreachName:         seed.Name,
			BreachDomain:       &domain,
			LeakDate:           &leakDate,
			ExposedDataClasses: seed.ExposedDataClasses,
			RecordCount:        &recordCount,
			Severity:           ClassifySeverity(seed.ExposedDataClasses),
			SourceNote:         &sourceNote,
		})
	}

	return breaches, nil
}

// ClassifySeverity assigns a severity level based on the types of exposed data.
// Exported so it can be independently tested.
//
// Rules:
//   - CRITICAL if exposed_data_classes includes "Passwords" AND ("Financial Credentials" OR "Government ID")
//   - HIGH if exposed_data_classes includes "Passwords" alone
//   - MEDIUM if exposed_data_classes includes "Phone Numbers" or "Physical Address" without "Passwords"
//   - LOW otherwise
func ClassifySeverity(exposedClasses []string) string {
	has := make(map[string]bool, len(exposedClasses))
	for _, c := range exposedClasses {
		has[c] = true
	}

	hasPasswords := has["Passwords"]
	hasFinancial := has["Financial Credentials"]
	hasGovID := has["Government ID"]
	hasPhone := has["Phone Numbers"]
	hasAddress := has["Physical Address"]

	if hasPasswords && (hasFinancial || hasGovID) {
		return "CRITICAL"
	}
	if hasPasswords {
		return "HIGH"
	}
	if hasPhone || hasAddress {
		return "MEDIUM"
	}
	return "LOW"
}
