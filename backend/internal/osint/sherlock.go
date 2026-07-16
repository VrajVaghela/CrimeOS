// sherlock.go — MOCK implementation of Sherlock-style username enumeration.
//
// This file defines the UsernameScanner interface and provides a deterministic
// mock implementation (MockSherlockScanner) that generates simulated social
// profile results using FNV hashing for reproducibility.
//
// SWAP POINT: To integrate a real OSINT provider (e.g. actual Sherlock CLI or
// API), implement the UsernameScanner interface and inject it into the worker
// instead of MockSherlockScanner.
package osint

import (
	"context"
	"fmt"
	"hash/fnv"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// UsernameScanner scans for social media profiles associated with a username.
type UsernameScanner interface {
	ScanUsername(ctx context.Context, username string) ([]SocialProfile, error)
}

var targetPlatforms = []struct {
	Name    string
	URLFmt  string
}{
	{"Instagram", "https://www.instagram.com/%s"},
	{"X/Twitter", "https://x.com/%s"},
	{"GitHub", "https://github.com/%s"},
	{"Reddit", "https://www.reddit.com/user/%s"},
	{"TikTok", "https://www.tiktok.com/@%s"},
	{"Facebook", "https://www.facebook.com/%s"},
	{"LinkedIn", "https://www.linkedin.com/in/%s"},
	{"Telegram", "https://t.me/%s"},
	{"YouTube", "https://www.youtube.com/@%s"},
	{"Pinterest", "https://www.pinterest.com/%s"},
	{"Snapchat", "https://www.snapchat.com/add/%s"},
	{"Discord", "https://discord.com/users/%s"},
}

// MockSherlockScanner is a deterministic mock that simulates Sherlock-style
// username enumeration. Results are derived from FNV hashing to ensure the
// same username always produces the same result set.
type MockSherlockScanner struct{}

func (m *MockSherlockScanner) ScanUsername(ctx context.Context, username string) ([]SocialProfile, error) {
	var profiles []SocialProfile

	for _, platform := range targetPlatforms {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		h := fnv.New64a()
		h.Write([]byte(username + ":" + platform.Name))
		hv := h.Sum64()

		// Simulate latency (50–200ms)
		rng := rand.New(rand.NewSource(int64(hv)))
		sleepMs := 50 + rng.Intn(150)
		time.Sleep(time.Duration(sleepMs) * time.Millisecond)

		// ~60% chance a profile is "found" on each platform
		if hv%10 >= 6 {
			continue
		}

		profileURL := fmt.Sprintf(platform.URLFmt, username)
		if platform.URLFmt == "" {
			profileURL = ""
		}

		bio := generateBio(hv)
		followerCount := int(hv%5000) + 10
		if hv%100 < 5 {
			followerCount = int(hv%500000) + 50000 // occasional high outlier
		}

		isVerified := hv%100 < 3 // <5% verified

		confidence := "LIKELY"
		mod := hv % 10
		if mod < 3 {
			confidence = "CONFIRMED"
		} else if mod >= 8 {
			confidence = "UNCERTAIN"
		}

		picURL := fmt.Sprintf("https://api.dicebear.com/7.x/initials/svg?seed=%s", username)

		profiles = append(profiles, SocialProfile{
			ID:                uuid.Nil, // set by DB on insert
			Platform:          platform.Name,
			Username:          username,
			ProfileURL:        profileURL,
			ProfilePictureURL: &picURL,
			Bio:               &bio,
			FollowerCount:     &followerCount,
			IsVerified:        isVerified,
			ExistsConfidence:  confidence,
		})
	}

	return profiles, nil
}

var bios = []string{
	"Digital explorer | Tech enthusiast",
	"Just a regular person on the internet",
	"Coffee addict & code writer",
	"Photography | Travel | Life",
	"Making the world a better place",
	"Student of life",
	"Professional overthinker",
	"Building things that matter",
}

func generateBio(hv uint64) string {
	return bios[hv%uint64(len(bios))]
}
