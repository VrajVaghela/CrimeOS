
package dispatch

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"crimeos/digitalfootprint/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// RecordEvent records a dispatch event for a legal request
func (r *Repository) RecordEvent(ctx context.Context, legalRequestID uuid.UUID, eventType string, detail map[string]any) error {
	detailJSON, err := json.Marshal(detail)
	if err != nil {
		return fmt.Errorf("marshal detail: %w", err)
	}

	_, err = r.pool.Exec(ctx, `
		INSERT INTO dispatch_events (legal_request_id, event_name, details)
		VALUES ($1, $2, $3)
	`, legalRequestID, eventType, detailJSON)
	if err != nil {
		return fmt.Errorf("insert event: %w", err)
	}
	return nil
}

// ListEvents lists all dispatch events for a legal request
func (r *Repository) ListEvents(ctx context.Context, legalRequestID uuid.UUID) ([]model.DispatchEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, event_name, details, created_at
		FROM dispatch_events
		WHERE legal_request_id = $1
		ORDER BY created_at ASC
	`, legalRequestID)
	if err != nil {
		return nil, fmt.Errorf("query events: %w", err)
	}
	defer rows.Close()

	var events []model.DispatchEvent
	for rows.Next() {
		var e model.DispatchEvent
		var detailsJSON []byte
		if err := rows.Scan(&e.ID, &e.LegalRequestID, &e.EventName, &detailsJSON, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		e.Details = make(map[string]any)
		if err := json.Unmarshal(detailsJSON, &e.Details); err != nil {
			return nil, fmt.Errorf("unmarshal details: %w", err)
		}
		events = append(events, e)
	}

	return events, nil
}

// CountFailedEvents counts SMTP_FAILED events for a legal request
func (r *Repository) CountFailedEvents(ctx context.Context, legalRequestID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM dispatch_events
		WHERE legal_request_id = $1 AND event_name = 'SMTP_FAILED'
	`, legalRequestID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count failed events: %w", err)
	}
	return count, nil
}

