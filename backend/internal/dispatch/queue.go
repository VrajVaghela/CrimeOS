
package dispatch

import (
	"errors"

	"github.com/google/uuid"
)

var ErrQueueFull = errors.New("dispatch queue is full")

// Job represents a dispatch job for a legal request
type Job struct {
	LegalRequestID uuid.UUID
}

// Queue is an in‑process channel‑based queue for dispatch jobs
type Queue struct {
	ch chan Job
}

// NewQueue creates a new Queue with the given buffer size
func NewQueue(bufferSize int) *Queue {
	return &Queue{ch: make(chan Job, bufferSize)}
}

// Enqueue adds a job to the queue, non‑blocking.
// Returns ErrQueueFull if the queue is full.
func (q *Queue) Enqueue(job Job) error {
	select {
	case q.ch <- job:
		return nil
	default:
		return ErrQueueFull
	}
}

// Jobs returns a read‑only channel for receiving jobs
func (q *Queue) Jobs() <-chan Job {
	return q.ch
}

