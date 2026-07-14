
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/analytics"
)

type IntelligenceFlagsHandler struct {
	pgRepo *analytics.Repository
}

func NewIntelligenceFlagsHandler(pgRepo *analytics.Repository) *IntelligenceFlagsHandler {
	return &IntelligenceFlagsHandler{pgRepo: pgRepo}
}

func (h *IntelligenceFlagsHandler) ListIntelligenceFlags(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	caseIDStr := chi.URLParam(r, "caseId")
	caseID, err := uuid.Parse(caseIDStr)
	if err != nil {
		http.Error(w, "invalid case id", http.StatusBadRequest)
		return
	}

	var statusPtr *string
	severity := r.URL.Query().Get("severity")
	if severity != "" {
		statusPtr = &severity
	}

	flags, err := h.pgRepo.ListByCase(ctx, caseID, statusPtr)
	if err != nil {
		http.Error(w, "failed to list intelligence flags", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"flags": flags})
}
