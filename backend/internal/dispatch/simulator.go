
package dispatch

import (
	"context"
	"math/rand"
	"os"
	"strconv"
	"time"

	"crimeos/digitalfootprint/internal/model"
)

// SimulateSMTPSend simulates sending an email to a service provider's nodal officer.
//
// DEMO SIMULATION ONLY: No real email is sent! For production, substitute with
// net/smtp or a transactional email API (e.g., SendGrid, Mailgun).
//
// Uses DISPATCH_SIM_SEED env var for deterministic outcomes (for demo runs).
func SimulateSMTPSend(ctx context.Context, req model.LegalRequest, provider model.ServiceProvider) (success bool, detail map[string]any, err error) {
	// Seed the PRNG for reproducibility if DISPATCH_SIM_SEED is set
	seedStr := os.Getenv("DISPATCH_SIM_SEED")
	var seed int64 = time.Now().UnixNano()
	if seedStr != "" {
		if s, err := strconv.ParseInt(seedStr, 10, 64); err == nil {
			seed = s
		}
	}
	rng := rand.New(rand.NewSource(seed))

	// 90% success rate
	success = rng.Float64() < 0.9
	detail = make(map[string]any)
	detail["to"] = provider.NodalOfficerEmail
	detail["request_number"] = req.RequestNumber

	if success {
		detail["smtp_response"] = "250 OK"
	} else {
		// Simulate random failure reasons
		reasons := []string{
			"550 mailbox unavailable",
			"451 temporary local error",
			"554 transaction failed",
		}
		detail["smtp_response"] = reasons[rng.Intn(len(reasons))]
	}

	// Simulate network delay (100ms to 500ms)
	delay := time.Duration(100+rng.Intn(400)) * time.Millisecond
	select {
	case <-ctx.Done():
		return false, map[string]any{"error": "context cancelled"}, ctx.Err()
	case <-time.After(delay):
		// ok
	}

	return success, detail, nil
}

