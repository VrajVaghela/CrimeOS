// holehe.go — MOCK implementation of Holehe-style email registration checks.
//
// This file defines the EmailRegistrationScanner interface and provides a
// deterministic mock implementation (MockHoleheScanner) that generates
// simulated email-registration results using FNV hashing.
//
// SWAP POINT: To integrate a real Holehe-style provider, implement the
// EmailRegistrationScanner interface and inject it into the worker.
//
// Note: For email registration checks, profile_url may be empty (registration
// checks don't confirm a public profile page), and exists_confidence should
// generally be LIKELY or UNCERTAIN — never CONFIRMED, since this is a
// registration check, not content verification.
package osint

import (
	"context"
	"hash/fnv"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// EmailRegistrationScanner checks whether an email address is registered
// on various online services.
type EmailRegistrationScanner interface {
	ScanEmail(ctx context.Context, email string) ([]SocialProfile, error)
}

var emailServices = []string{
	"Spotify", "Netflix", "Amazon", "Dropbox", "Adobe",
	"Airbnb", "Pinterest", "Tumblr", "WordPress", "Gravatar",
	"Flickr", "Duolingo",
}

// MockHoleheScanner is a deterministic mock that simulates Holehe-style
// email-registration checks. Results are derived from FNV hashing.
type MockHoleheScanner struct{}

func (m *MockHoleheScanner) ScanEmail(ctx context.Context, email string) ([]SocialProfile, error) {
	var profiles []SocialProfile

	for _, service := range emailServices {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		h := fnv.New64a()
		h.Write([]byte(email + ":holehe:" + service))
		hv := h.Sum64()

		// Simulate latency (50–200ms)
		rng := rand.New(rand.NewSource(int64(hv)))
		sleepMs := 50 + rng.Intn(150)
		time.Sleep(time.Duration(sleepMs) * time.Millisecond)

		// ~50% chance the email is registered on the service
		if hv%10 >= 5 {
			continue
		}

		// Registration checks: no public profile URL, never CONFIRMED confidence
		confidence := "LIKELY"
		if hv%5 == 0 {
			confidence = "UNCERTAIN"
		}

		profiles = append(profiles, SocialProfile{
			ID:               uuid.Nil,
			Platform:         service,
			Username:         email,
			ProfileURL:       "", // empty for email registration checks
			IsVerified:       false,
			ExistsConfidence: confidence,
		})
	}

	return profiles, nil
}
