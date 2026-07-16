
package entity

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"crimeos/digitalfootprint/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) BulkInsert(ctx context.Context, caseID uuid.UUID, complaintRefID *uuid.UUID, items []Extracted, extractedBy string) ([]model.DigitalEntity, error) {
	if len(items) == 0 {
		return []model.DigitalEntity{}, nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var result []model.DigitalEntity

	for _, item := range items {
		var id uuid.UUID
		var createdAt, updatedAt time.Time
		var status string = "EXTRACTED"

		err := tx.QueryRow(ctx, `
			INSERT INTO digital_entities (
				case_id, complaint_ref_id, entity_type, raw_value, normalized_value,
				source_text_offset, confidence_score, status, extracted_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (case_id, entity_type, normalized_value) DO UPDATE SET updated_at = NOW()
			RETURNING id, created_at, updated_at, status
		`, caseID, complaintRefID, item.EntityType, item.RawValue, item.NormalizedValue,
			pgtype.Range[int32]{Lower: int32(item.Offset[0]), Upper: int32(item.Offset[1]), LowerType: pgtype.Inclusive, UpperType: pgtype.Exclusive},
			item.Confidence, status, extractedBy).Scan(&id, &createdAt, &updatedAt, &status)
		if err != nil {
			return nil, fmt.Errorf("insert digital entity: %w", err)
		}

		result = append(result, model.DigitalEntity{
			ID:                id,
			CaseID:            caseID,
			ComplaintRefID:    complaintRefID,
			EntityType:        item.EntityType,
			RawValue:          item.RawValue,
			NormalizedValue:   item.NormalizedValue,
			SourceTextOffset:  item.Offset,
			ConfidenceScore:   item.Confidence,
			Status:            status,
			ExtractedBy:       extractedBy,
			CreatedAt:         createdAt,
			UpdatedAt:         updatedAt,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return result, nil
}

func (r *Repository) ListByCaseFiltered(ctx context.Context, caseID uuid.UUID, status, entityType string) ([]model.DigitalEntity, int, error) {
	where := []string{"case_id = $1"}
	args := []any{caseID}
	argIdx := 2

	if status != "" {
		where = append(where, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	if entityType != "" {
		where = append(where, fmt.Sprintf("entity_type = $%d", argIdx))
		args = append(args, entityType)
		argIdx++
	}

	query := `
		SELECT id, case_id, complaint_ref_id, entity_type, raw_value, normalized_value, 
		       source_text_offset, confidence_score, status, extracted_by, created_at, updated_at
		FROM digital_entities
		WHERE ` + joinWithAnd(where) + ` ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query entities: %w", err)
	}
	defer rows.Close()

	var entities []model.DigitalEntity
	for rows.Next() {
		var e model.DigitalEntity
		var offset pgtype.Range[int32]
		err := rows.Scan(
			&e.ID, &e.CaseID, &e.ComplaintRefID, &e.EntityType, &e.RawValue, &e.NormalizedValue,
			&offset, &e.ConfidenceScore, &e.Status, &e.ExtractedBy, &e.CreatedAt, &e.UpdatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("scan entity: %w", err)
		}
		if offset.Valid {
			e.SourceTextOffset = [2]int{int(offset.Lower), int(offset.Upper)}
		}
		entities = append(entities, e)
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM digital_entities WHERE " + joinWithAnd(where)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("query total: %w", err)
	}

	return entities, total, nil
}

func joinWithAnd(parts []string) string {
	if len(parts) == 0 {
		return "1=1"
	}
	if len(parts) == 1 {
		return parts[0]
	}
	result := parts[0]
	for i := 1; i < len(parts); i++ {
		result += " AND " + parts[i]
	}
	return result
}

func (r *Repository) GetByCaseTypeNormalizedValue(ctx context.Context, caseID uuid.UUID, entityType, normalizedValue string) (*model.DigitalEntity, error) {
	var e model.DigitalEntity
	var offset pgtype.Range[int32]
	err := r.pool.QueryRow(ctx, `
		SELECT id, case_id, complaint_ref_id, entity_type, raw_value, normalized_value,
		       source_text_offset, confidence_score, status, extracted_by, created_at, updated_at
		FROM digital_entities
		WHERE case_id = $1 AND entity_type = $2 AND normalized_value = $3
	`, caseID, entityType, normalizedValue).Scan(
		&e.ID, &e.CaseID, &e.ComplaintRefID, &e.EntityType, &e.RawValue, &e.NormalizedValue,
		&offset, &e.ConfidenceScore, &e.Status, &e.ExtractedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get entity by case/type/normalized: %w", err)
	}
	if offset.Valid {
		e.SourceTextOffset = [2]int{int(offset.Lower), int(offset.Upper)}
	}
	return &e, nil
}

func (r *Repository) CreateOrGetExtractedEntity(ctx context.Context, caseID uuid.UUID, entityType, rawValue, normalizedValue, extractedBy string, confidenceScore float64) (*model.DigitalEntity, error) {
	var e model.DigitalEntity
	var offset pgtype.Range[int32]
	err := r.pool.QueryRow(ctx, `
		INSERT INTO digital_entities (
			case_id, complaint_ref_id, entity_type, raw_value, normalized_value,
			source_text_offset, confidence_score, status, extracted_by
		) VALUES ($1, NULL, $2, $3, $4, NULL, $5, 'EXTRACTED', $6)
		ON CONFLICT (case_id, entity_type, normalized_value) DO UPDATE
			SET updated_at = NOW()
		RETURNING id, case_id, complaint_ref_id, entity_type, raw_value, normalized_value,
		       source_text_offset, confidence_score, status, extracted_by, created_at, updated_at
	`, caseID, entityType, rawValue, normalizedValue, confidenceScore, extractedBy).Scan(
		&e.ID, &e.CaseID, &e.ComplaintRefID, &e.EntityType, &e.RawValue, &e.NormalizedValue,
		&offset, &e.ConfidenceScore, &e.Status, &e.ExtractedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create or get extracted entity: %w", err)
	}
	if offset.Valid {
		e.SourceTextOffset = [2]int{int(offset.Lower), int(offset.Upper)}
	}
	return &e, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*model.DigitalEntity, error) {
	var e model.DigitalEntity
	var offset pgtype.Range[int32]
	err := r.pool.QueryRow(ctx, `
		SELECT id, case_id, complaint_ref_id, entity_type, raw_value, normalized_value, 
		       source_text_offset, confidence_score, status, extracted_by, created_at, updated_at
		FROM digital_entities WHERE id = $1`, id).Scan(
		&e.ID, &e.CaseID, &e.ComplaintRefID, &e.EntityType, &e.RawValue, &e.NormalizedValue,
		&offset, &e.ConfidenceScore, &e.Status, &e.ExtractedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("query entity: %w", err)
	}
	if offset.Valid {
		e.SourceTextOffset = [2]int{int(offset.Lower), int(offset.Upper)}
	}
	return &e, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) (*model.DigitalEntity, error) {
	var e model.DigitalEntity
	var offset pgtype.Range[int32]
	err := r.pool.QueryRow(ctx, `
		UPDATE digital_entities
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, case_id, complaint_ref_id, entity_type, raw_value, normalized_value, 
		          source_text_offset, confidence_score, status, extracted_by, created_at, updated_at
	`, status, id).Scan(
		&e.ID, &e.CaseID, &e.ComplaintRefID, &e.EntityType, &e.RawValue, &e.NormalizedValue,
		&offset, &e.ConfidenceScore, &e.Status, &e.ExtractedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update entity: %w", err)
	}
	if offset.Valid {
		e.SourceTextOffset = [2]int{int(offset.Lower), int(offset.Upper)}
	}
	return &e, nil
}
