
package analytics

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"crimeos/digitalfootprint/internal/model"
)

// BulkInsertFlags inserts multiple IntelligenceFlag into PostgreSQL
func (r *Repository) BulkInsertFlags(ctx context.Context, flags []model.IntelligenceFlag) error {
	batch := &pgx.Batch{}
	for _, flag := range flags {
		rawRowRefsJSON, _ := json.Marshal(flag.RawRowRefs)
		recordIDsJSON, _ := json.Marshal(flag.RecordIDs)
		batch.Queue(`
			INSERT INTO intelligence_flags (
				id, case_id, legal_request_id, flag_type, severity, summary,
				raw_row_refs, record_ids, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, flag.ID, flag.CaseID, flag.LegalRequestID, flag.FlagType, flag.Severity, flag.Summary, rawRowRefsJSON, recordIDsJSON, flag.CreatedAt)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()
	for i := 0; i < len(flags); i++ {
		_, err := br.Exec()
		if err != nil {
			return fmt.Errorf("bulk insert flag failed at index %d: %w", i, err)
		}
	}
	return nil
}

// ListByCase lists intelligence flags for a case, optionally filtered by severity
func (r *Repository) ListByCase(ctx context.Context, caseID uuid.UUID, severity *string) ([]model.IntelligenceFlag, error) {
	var query string
	var args []any
	if severity != nil && *severity != "" {
		query = `
			SELECT id, case_id, legal_request_id, flag_type, severity, summary,
				   raw_row_refs, record_ids, created_at
			FROM intelligence_flags
			WHERE case_id = $1 AND severity = $2
			ORDER BY created_at DESC
		`
		args = []any{caseID, *severity}
	} else {
		query = `
			SELECT id, case_id, legal_request_id, flag_type, severity, summary,
				   raw_row_refs, record_ids, created_at
			FROM intelligence_flags
			WHERE case_id = $1
			ORDER BY created_at DESC
		`
		args = []any{caseID}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list flags: %w", err)
	}
	defer rows.Close()

	var flags []model.IntelligenceFlag
	for rows.Next() {
		var flag model.IntelligenceFlag
		var rawRowRefsJSON, recordIDsJSON []byte
		if err := rows.Scan(
			&flag.ID, &flag.CaseID, &flag.LegalRequestID, &flag.FlagType, &flag.Severity, &flag.Summary,
			&rawRowRefsJSON, &recordIDsJSON, &flag.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan flag: %w", err)
		}

		if err := json.Unmarshal(rawRowRefsJSON, &flag.RawRowRefs); err != nil {
			return nil, fmt.Errorf("unmarshal raw_row_refs: %w", err)
		}
		if err := json.Unmarshal(recordIDsJSON, &flag.RecordIDs); err != nil {
			return nil, fmt.Errorf("unmarshal record_ids: %w", err)
		}

		flags = append(flags, flag)
	}
	return flags, nil
}
