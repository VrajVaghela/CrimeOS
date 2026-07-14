
package lers

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

// ListProviders retrieves service providers, optionally filtered by category
func (r *Repository) ListProviders(ctx context.Context, category *string) ([]model.ServiceProvider, error) {
	var query string
	var args []any

	if category != nil && *category != "" {
		query = `
			SELECT id, name, provider_category, nodal_officer_email, nodal_officer_phone, sla_hours, active, created_at
			FROM service_providers
			WHERE provider_category = $1
			ORDER BY name ASC
		`
		args = []any{*category}
	} else {
		query = `
			SELECT id, name, provider_category, nodal_officer_email, nodal_officer_phone, sla_hours, active, created_at
			FROM service_providers
			ORDER BY name ASC
		`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query providers: %w", err)
	}
	defer rows.Close()

	var providers []model.ServiceProvider
	for rows.Next() {
		var p model.ServiceProvider
		err := rows.Scan(
			&p.ID, &p.Name, &p.ProviderCategory, &p.NodalOfficerEmail,
			&p.NodalOfficerPhone, &p.SLAHours, &p.Active, &p.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan provider: %w", err)
		}
		providers = append(providers, p)
	}

	return providers, nil
}

// NextRequestSequence returns COUNT(*) + 1 for requests in the given year
// WARNING: CONCURRENCY CAVEAT
// This uses COUNT(*)+1 which is race-prone under high concurrent inserts (two requests can get the same sequence).
// PRODUCTION FIX: Replace with a dedicated Postgres SEQUENCE per year (e.g., lers_seq_2026), created dynamically if missing.
func (r *Repository) NextRequestSequence(ctx context.Context, tx pgx.Tx, year int) (int, error) {
	pattern := fmt.Sprintf("LERS/%d/%%", year)
	var count int
	err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM legal_requests WHERE request_number LIKE $1`, pattern).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count requests: %w", err)
	}
	return count + 1, nil
}

// Insert inserts a new legal request (must be called in a transaction)
func (r *Repository) Insert(ctx context.Context, tx pgx.Tx, req model.LegalRequest) (model.LegalRequest, error) {
	var inserted model.LegalRequest
	err := tx.QueryRow(ctx, `
		INSERT INTO legal_requests (
			case_id, request_number, provider_id, template_type, linked_entity_ids,
			status, rendered_doc_path, drafted_by, approved_by, sla_due_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, case_id, request_number, provider_id, template_type, linked_entity_ids,
		          status, rendered_doc_path, drafted_by, approved_by, sla_due_at, created_at, updated_at
	`, req.CaseID, req.RequestNumber, req.ProviderID, req.TemplateType, req.LinkedEntityIDs,
		req.Status, req.RenderedDocPath, req.DraftedBy, req.ApprovedBy, req.SLADueAt).Scan(
		&inserted.ID, &inserted.CaseID, &inserted.RequestNumber, &inserted.ProviderID, &inserted.TemplateType,
		&inserted.LinkedEntityIDs, &inserted.Status, &inserted.RenderedDocPath, &inserted.DraftedBy,
		&inserted.ApprovedBy, &inserted.SLADueAt, &inserted.CreatedAt, &inserted.UpdatedAt,
	)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("insert legal request: %w", err)
	}

	return inserted, nil
}

// GetByID retrieves a legal request and its associated dispatch events
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.LegalRequest, []model.DispatchEvent, error) {
	// First get the legal request
	var req model.LegalRequest
	err := r.pool.QueryRow(ctx, `
		SELECT id, case_id, request_number, provider_id, template_type, linked_entity_ids,
		       status, rendered_doc_path, drafted_by, approved_by, sla_due_at, created_at, updated_at
		FROM legal_requests WHERE id = $1
	`, id).Scan(
		&req.ID, &req.CaseID, &req.RequestNumber, &req.ProviderID, &req.TemplateType, &req.LinkedEntityIDs,
		&req.Status, &req.RenderedDocPath, &req.DraftedBy, &req.ApprovedBy,
		&req.SLADueAt, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return model.LegalRequest{}, nil, fmt.Errorf("get legal request: %w", err)
	}

	// Now get dispatch events
	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, event_name, details, created_at
		FROM dispatch_events WHERE legal_request_id = $1 ORDER BY created_at ASC
	`, id)
	if err != nil {
		return model.LegalRequest{}, nil, fmt.Errorf("query dispatch events: %w", err)
	}
	defer rows.Close()

	var events []model.DispatchEvent
	for rows.Next() {
		var e model.DispatchEvent
		var detailsJSON []byte
		err := rows.Scan(&e.ID, &e.LegalRequestID, &e.EventName, &detailsJSON, &e.CreatedAt)
		if err != nil {
			return model.LegalRequest{}, nil, fmt.Errorf("scan dispatch event: %w", err)
		}
		e.Details = make(map[string]any)
		if err := json.Unmarshal(detailsJSON, &e.Details); err != nil {
			return model.LegalRequest{}, nil, fmt.Errorf("unmarshal details: %w", err)
		}
		events = append(events, e)
	}

	return req, events, nil
}

// UpdateStatus updates the status of a legal request
func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, newStatus string, approvedBy *string, extra map[string]any) (model.LegalRequest, error) {
	var req model.LegalRequest

	query := `
		UPDATE legal_requests
		SET status = $1, updated_at = NOW()
	`
	args := []any{newStatus}
	argIdx := 2

	if approvedBy != nil {
		query += fmt.Sprintf(", approved_by = $%d", argIdx)
		args = append(args, *approvedBy)
		argIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d RETURNING id, case_id, request_number, provider_id, template_type, linked_entity_ids, status, rendered_doc_path, drafted_by, approved_by, sla_due_at, created_at, updated_at", argIdx)
	args = append(args, id)

	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&req.ID, &req.CaseID, &req.RequestNumber, &req.ProviderID, &req.TemplateType, &req.LinkedEntityIDs,
		&req.Status, &req.RenderedDocPath, &req.DraftedBy, &req.ApprovedBy, &req.SLADueAt,
		&req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("update legal request status: %w", err)
	}

	return req, nil
}

// GetProviderByID retrieves a service provider by its ID
func (r *Repository) GetProviderByID(ctx context.Context, id uuid.UUID) (*model.ServiceProvider, error) {
	var p model.ServiceProvider
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, provider_category, nodal_officer_email, nodal_officer_phone, sla_hours, active, created_at
		FROM service_providers WHERE id = $1
	`, id).Scan(
		&p.ID, &p.Name, &p.ProviderCategory, &p.NodalOfficerEmail,
		&p.NodalOfficerPhone, &p.SLAHours, &p.Active, &p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get provider: %w", err)
	}
	return &p, nil
}

// GetEntitiesByIDs retrieves digital entities by their IDs, verifying they belong to the given case
func (r *Repository) GetEntitiesByIDs(ctx context.Context, caseID uuid.UUID, ids []uuid.UUID) ([]model.DigitalEntity, error) {
	if len(ids) == 0 {
		return []model.DigitalEntity{}, nil
	}

	// Build query
	query := `
		SELECT id, case_id, complaint_ref_id, entity_type, raw_value, normalized_value,
		       source_text_offset, confidence_score, status, extracted_by, created_at, updated_at
		FROM digital_entities WHERE id = ANY($1) AND case_id = $2
	`
	rows, err := r.pool.Query(ctx, query, ids, caseID)
	if err != nil {
		return nil, fmt.Errorf("query entities: %w", err)
	}
	defer rows.Close()

	var entities []model.DigitalEntity
	for rows.Next() {
		var e model.DigitalEntity
		var offset pgtype.Range[int32]
		err := rows.Scan(
			&e.ID, &e.CaseID, &e.ComplaintRefID, &e.EntityType, &e.RawValue, &e.NormalizedValue,
			&offset, &e.ConfidenceScore, &e.Status, &e.ExtractedBy, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan entity: %w", err)
		}
		if offset.Valid {
			e.SourceTextOffset = [2]int{int(offset.Lower), int(offset.Upper)}
		}
		entities = append(entities, e)
	}

	return entities, nil
}

// StatusSummary returns count of legal requests per status for a case
func (r *Repository) StatusSummary(ctx context.Context, caseID uuid.UUID) (map[string]int, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT status, COUNT(*) FROM legal_requests
		WHERE case_id = $1
		GROUP BY status
	`, caseID)
	if err != nil {
		return nil, fmt.Errorf("query status summary: %w", err)
	}
	defer rows.Close()

	summary := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("scan summary row: %w", err)
		}
		summary[status] = count
	}
	return summary, nil
}

// ListWithTimeline lists legal requests for a case with their dispatch events
func (r *Repository) ListWithTimeline(ctx context.Context, caseID uuid.UUID) ([]model.LegalRequestWithEvents, error) {
	// Step 1: Get all legal requests for case
	reqRows, err := r.pool.Query(ctx, `
		SELECT id, case_id, request_number, provider_id, template_type, linked_entity_ids,
		       status, rendered_doc_path, drafted_by, approved_by, sla_due_at, created_at, updated_at
		FROM legal_requests WHERE case_id = $1
		ORDER BY created_at DESC
	`, caseID)
	if err != nil {
		return nil, fmt.Errorf("query legal requests: %w", err)
	}
	defer reqRows.Close()

	var requests []model.LegalRequest
	var reqIDs []uuid.UUID
	reqIDToIndex := make(map[uuid.UUID]int)

	for reqRows.Next() {
		var req model.LegalRequest
		if err := reqRows.Scan(
			&req.ID, &req.CaseID, &req.RequestNumber, &req.ProviderID, &req.TemplateType, &req.LinkedEntityIDs,
			&req.Status, &req.RenderedDocPath, &req.DraftedBy, &req.ApprovedBy, &req.SLADueAt,
			&req.CreatedAt, &req.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan legal request: %w", err)
		}
		reqIDToIndex[req.ID] = len(requests)
		reqIDs = append(reqIDs, req.ID)
		requests = append(requests, req)
	}

	// Step 2: Get all dispatch events for those request IDs in one go
	var result []model.LegalRequestWithEvents
	result = make([]model.LegalRequestWithEvents, len(requests))
	for i, req := range requests {
		result[i].LegalRequest = req
		result[i].Events = []model.DispatchEvent{}
	}

	if len(reqIDs) > 0 {
		eventRows, err := r.pool.Query(ctx, `
			SELECT id, legal_request_id, event_name, details, created_at
			FROM dispatch_events WHERE legal_request_id = ANY($1)
			ORDER BY legal_request_id, created_at ASC
		`, reqIDs)
		if err != nil {
			return nil, fmt.Errorf("query dispatch events: %w", err)
		}
		defer eventRows.Close()

		for eventRows.Next() {
			var e model.DispatchEvent
			var detailsJSON []byte
			if err := eventRows.Scan(&e.ID, &e.LegalRequestID, &e.EventName, &detailsJSON, &e.CreatedAt); err != nil {
				return nil, fmt.Errorf("scan event: %w", err)
			}
			e.Details = make(map[string]any)
			if err := json.Unmarshal(detailsJSON, &e.Details); err != nil {
				return nil, fmt.Errorf("unmarshal details: %w", err)
			}
			if idx, ok := reqIDToIndex[e.LegalRequestID]; ok {
				result[idx].Events = append(result[idx].Events, e)
			}
		}
	}

	return result, nil
}

// ListByCaseAndStatus lists legal requests for a case with optional status filter
func (r *Repository) ListByCaseAndStatus(ctx context.Context, caseID uuid.UUID, status *string) ([]model.LegalRequest, error) {
	var query string
	var args []any

	if status != nil && *status != "" {
		query = `
			SELECT id, case_id, request_number, provider_id, template_type, linked_entity_ids,
			       status, rendered_doc_path, drafted_by, approved_by, sla_due_at, created_at, updated_at
			FROM legal_requests
			WHERE case_id = $1 AND status = $2
			ORDER BY created_at DESC
		`
		args = []any{caseID, *status}
	} else {
		query = `
			SELECT id, case_id, request_number, provider_id, template_type, linked_entity_ids,
			       status, rendered_doc_path, drafted_by, approved_by, sla_due_at, created_at, updated_at
			FROM legal_requests
			WHERE case_id = $1
			ORDER BY created_at DESC
		`
		args = []any{caseID}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query legal requests: %w", err)
	}
	defer rows.Close()

	var requests []model.LegalRequest
	for rows.Next() {
		var req model.LegalRequest
		if err := rows.Scan(
			&req.ID, &req.CaseID, &req.RequestNumber, &req.ProviderID, &req.TemplateType, &req.LinkedEntityIDs,
			&req.Status, &req.RenderedDocPath, &req.DraftedBy, &req.ApprovedBy, &req.SLADueAt,
			&req.CreatedAt, &req.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan legal request: %w", err)
		}
		requests = append(requests, req)
	}
	return requests, nil
}

// MarkOverdue marks eligible legal requests as OVERDUE
func (r *Repository) MarkOverdue(ctx context.Context) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `
		UPDATE legal_requests
		SET status = 'OVERDUE', updated_at = NOW()
		WHERE status IN ('SENT', 'ACKNOWLEDGED') AND sla_due_at < NOW()
		RETURNING id
	`)
	if err != nil {
		return nil, fmt.Errorf("update overdue: %w", err)
	}
	defer rows.Close()

	var updatedIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan updated id: %w", err)
		}
		updatedIDs = append(updatedIDs, id)
	}
	return updatedIDs, nil
}
