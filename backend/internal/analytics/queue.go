
package analytics

import (
	"errors"
)

var ErrQueueFull = errors.New("parse queue is full")

// ParseJob represents a job to parse a raw response dump
type ParseJob struct {
	DumpID string
}

// Queue is an in‑process channel‑based queue for parse jobs
type Queue struct {
	ch chan ParseJob
}

func NewQueue(bufferSize int) *Queue {
	return &Queue{ch: make(chan ParseJob, bufferSize)}
}

// Enqueue adds a parse job (non‑blocking)
func (q *Queue) Enqueue(job ParseJob) error {
	select {
	case q.ch <- job:
		return nil
	default:
		return ErrQueueFull
	}
}

// Jobs returns a read‑only channel of parse jobs
func (q *Queue) Jobs() <-chan ParseJob {
	return q.ch
}

