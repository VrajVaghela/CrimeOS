
package caselog

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Publisher publishes intel events to the case timeline via the outbox pattern.
type Publisher interface {
	Publish(ctx context.Context, event IntelEvent) error
}

// PostgresPublisher is a Publisher that writes events to the caselog_outbox table.
type PostgresPublisher struct {
	pool *pgxpool.Pool
}

// NewPostgresPublisher creates a new PostgresPublisher.
func NewPostgresPublisher(pool *pgxpool.Pool) *PostgresPublisher {
	return &PostgresPublisher{pool: pool}
}

// Publish writes an IntelEvent to caselog_outbox with published=false.
func (p *PostgresPublisher) Publish(ctx context.Context, event IntelEvent) error {
	linkedEntityIDsJSON, err := json.Marshal(event.LinkedEntityIDs)
	if err != nil {
		return fmt.Errorf("marshal linked entity IDs: %w", err)
	}

	_, err = p.pool.Exec(ctx, `
		INSERT INTO caselog_outbox (
			id, case_id, source, summary, severity, linked_entity_ids, occurred_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		uuid.New(),
		event.CaseID,
		event.Source,
		event.Summary,
		event.Severity,
		linkedEntityIDsJSON,
		event.OccurredAt,
	)
	if err != nil {
		return fmt.Errorf("insert into caselog_outbox: %w", err)
	}
	return nil
}
