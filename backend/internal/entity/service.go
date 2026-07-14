
package entity

import (
	"context"

	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/model"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ExtractAndPersist(ctx context.Context, caseID uuid.UUID, complaintRefID *uuid.UUID, sourceText string, extractedBy string) ([]model.DigitalEntity, error) {
	extracted := Extract(sourceText)
	return s.repo.BulkInsert(ctx, caseID, complaintRefID, extracted, extractedBy)
}
