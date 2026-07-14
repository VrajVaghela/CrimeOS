
package lers

import (
	"context"
	"errors"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"crimeos/digitalfootprint/internal/entity"
	"crimeos/digitalfootprint/internal/model"
)

// Errors
var (
	ErrEntityNotConfirmed = errors.New("one or more linked entities are not confirmed")
	ErrProviderInactive  = errors.New("service provider is inactive")
	ErrInvalidStatus    = errors.New("invalid status transition")
)

type Service struct {
	repo       *Repository
	entityRepo *entity.Repository
	engine     *Engine
	pool       *pgxpool.Pool
}

func NewService(repo *Repository, entityRepo *entity.Repository, engine *Engine, pool *pgxpool.Pool) *Service {
	return &Service{repo: repo, entityRepo: entityRepo, engine: engine, pool: pool}
}

// RenderToDocument writes rendered text to an HTML file (hackathon PDF stand-in)
func RenderToDocument(renderedText string, reqID uuid.UUID) (string, error) {
	// Create output directory if missing
	outDir := "./rendered_requests"
	if err := os.MkdirAll(outDir, 0755); err != nil {
		return "", fmt.Errorf("create output dir: %w", err)
	}

	// HTML wrapper template
	const htmlTmpl = `
<!DOCTYPE html>
<html>
<head>
	<title>{{.RequestID}}</title>
	<style>body{font-family:monospace;white-space:pre-wrap;padding:20px;}</style>
</head>
<body>{{.Content}}</body>
</html>`
	tmpl, err := template.New("doc").Parse(htmlTmpl)
	if err != nil {
		return "", fmt.Errorf("parse html template: %w", err)
	}

	outPath := filepath.Join(outDir, fmt.Sprintf("%s.html", reqID.String()))
	f, err := os.Create(outPath)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer f.Close()

	data := struct {
		RequestID uuid.UUID
		Content   string
	}{RequestID: reqID, Content: renderedText}

	if err := tmpl.Execute(f, data); err != nil {
		return "", fmt.Errorf("execute html: %w", err)
	}

	return outPath, nil
}

// CreateRequest creates a new drafted legal request
func (s *Service) CreateRequest(ctx context.Context, caseID uuid.UUID, providerID uuid.UUID, templateType string, linkedEntityIDs []uuid.UUID, draftedBy string, issuingOfficerName, issuingOfficerDesignation, policeStation, legalBasis string) (model.LegalRequest, error) {
	// Step 1: Fetch and validate linked entities are all CONFIRMED and belong to the case
	entities, err := s.repo.GetEntitiesByIDs(ctx, caseID, linkedEntityIDs)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("get entities: %w", err)
	}
	if len(entities) != len(linkedEntityIDs) {
		return model.LegalRequest{}, errors.New("some linked entities not found")
	}
	for _, e := range entities {
		if e.Status != "CONFIRMED" {
			return model.LegalRequest{}, ErrEntityNotConfirmed
		}
	}

	// Step 2: Fetch and validate provider is active
	provider, err := s.repo.GetProviderByID(ctx, providerID)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("get provider: %w", err)
	}
	if !provider.Active {
		return model.LegalRequest{}, ErrProviderInactive
	}

	// Step 3: Begin transaction and create request
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Generate request number
	year := time.Now().Year()
	seq, err := s.repo.NextRequestSequence(ctx, tx, year)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("next sequence: %w", err)
	}
	requestNumber := GenerateRequestNumber(seq, year)

	// Compute SLA due at
	now := time.Now()
	slaDueAt := now.Add(time.Hour * time.Duration(provider.SLAHours))

	// Create request model (with temporary ID)
	reqID := uuid.New()
	req := model.LegalRequest{
		ID:               reqID,
		CaseID:           caseID,
		RequestNumber:    requestNumber,
		ProviderID:       providerID,
		TemplateType:     templateType,
		LinkedEntityIDs: linkedEntityIDs,
		Status:           "DRAFTED",
		DraftedBy:        draftedBy,
		SLADueAt:         slaDueAt,
	}

	// Step4: Render the document
	// Prepare entity lines
	var entityLines []EntityLine
	for _, e := range entities {
		entityLines = append(entityLines, EntityLine{
			EntityType: e.EntityType,
			Value:      e.NormalizedValue,
		})
	}

	renderInput := RenderInput{
		RequestNumber:           requestNumber,
		CaseNumber:             caseID.String(), // Use caseID as case number for now
		ProviderName:           provider.Name,
		NodalOfficerEmail:      provider.NodalOfficerEmail,
		IssuingOfficerName:   issuingOfficerName,
		IssuingOfficerDesignation: issuingOfficerDesignation,
		PoliceStation:         policeStation,
		LegalBasis:            legalBasis,
		RequestedEntities:     entityLines,
		DateIssued:           now,
		ResponseDeadline:     slaDueAt,
	}

	renderedText, err := s.engine.Render(templateType, renderInput)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("render document: %w", err)
	}

	// Write to file
	docPath, err := RenderToDocument(renderedText, reqID)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("write document: %w", err)
	}
	req.RenderedDocPath = &docPath

	// Insert into DB
	inserted, err := s.repo.Insert(ctx, tx, req)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("insert request: %w", err)
	}

	// Commit tx
	if err := tx.Commit(ctx); err != nil {
		return model.LegalRequest{}, fmt.Errorf("commit tx: %w", err)
	}

	return inserted, nil
}

// ApproveRequest approves a drafted legal request, moving it to QUEUED
func (s *Service) ApproveRequest(ctx context.Context, reqID uuid.UUID, approvedBy string) (model.LegalRequest, error) {
	// First get current status
	req, _, err := s.repo.GetByID(ctx, reqID)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("get request: %w", err)
	}

	if req.Status != "DRAFTED" {
		return model.LegalRequest{}, ErrInvalidStatus
	}

	// Update status
	updated, err := s.repo.UpdateStatus(ctx, reqID, "QUEUED", &approvedBy, nil)
	if err != nil {
		return model.LegalRequest{}, fmt.Errorf("update status: %w", err)
	}

	return updated, nil
}
