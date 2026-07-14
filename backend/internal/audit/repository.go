
package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Record(ctx context.Context, actorID, action, resourceType string, resourceID *uuid.UUID, before, after any, ipAddress string) error {
	var beforeJSON, afterJSON []byte

	if before != nil {
		b, err := json.Marshal(before)
		if err != nil {
			return fmt.Errorf("marshal before: %w", err)
		}
		beforeJSON = b
	}
	if after != nil {
		b, err := json.Marshal(after)
		if err != nil {
			return fmt.Errorf("marshal after: %w", err)
		}
		afterJSON = b
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO audit_log (actor_id, action, resource_type, resource_id, before_state, after_state, ip_address)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, actorID, action, resourceType, resourceID, beforeJSON, afterJSON, ipAddress)
	return err
}
