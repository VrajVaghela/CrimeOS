
// Package dispatch implements the simulated SMTP dispatch worker for legal requests.
//
// State machine:
// DRAFTED → QUEUED → SENT → ACKNOWLEDGED → (RESPONDED in Stage 3)
//       ↘ OVERDUE
//
// QUEUE IMPLEMENTATION NOTE:
// This uses an in‑process channel‑based queue for hackathon scope.
// For production use, replace with a Redis‑backed queue such as
// github.com/hibiken/asynq or raw Redis streams to support multiple
// worker processes and persistence across restarts.
package dispatch
