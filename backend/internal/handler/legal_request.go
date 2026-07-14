
package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/lers"
)

type LegalRequestHandler struct {
	service *lers.Service
	repo    *lers.Repository
}

func NewLegalRequestHandler(service *lers.Service, repo *lers.Repository) *LegalRequestHandler {
	return &LegalRequestHandler{service: service, repo: repo}
}

type CreateLegalRequestBody struct {
	ProviderID              uuid.UUID   `json:"provider_id"`
	TemplateType            string      `json:"template_type"`
	LinkedEntityIDs         []uuid.UUID `json:"linked_entity_ids"`
	DraftedBy               string      `json:"drafted_by"`
	IssuingOfficerName      string      `json:"issuing_officer_name"`
	IssuingOfficerDesignation string    `json:"issuing_officer_designation"`
	PoliceStation           string      `json:"police_station"`
	LegalBasis              string      `json:"legal_basis"`
}

type ApproveLegalRequestBody struct {
	ApprovedBy string `json:"approved_by"`
}

func (h *LegalRequestHandler) ListProviders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	category := r.URL.Query().Get("category")
	var catPtr *string
	if category != "" {
		catPtr = &category
	}

	providers, err := h.repo.ListProviders(ctx, catPtr)
	if err != nil {
		http.Error(w, "failed to list providers", http.StatusInternalServerError)
		return
	}

	resp := map[string]any{
		"providers": providers,
		"total":     len(providers),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *LegalRequestHandler) CreateLegalRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	caseIDStr := chi.URLParam(r, "caseId")
	caseID, err := uuid.Parse(caseIDStr)
	if err != nil {
		http.Error(w, "invalid case ID", http.StatusBadRequest)
		return
	}

	var body CreateLegalRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req, err := h.service.CreateRequest(ctx, caseID, body.ProviderID, body.TemplateType, body.LinkedEntityIDs, body.DraftedBy, body.IssuingOfficerName, body.IssuingOfficerDesignation, body.PoliceStation, body.LegalBasis)
	if err != nil {
		switch {
		case errors.Is(err, lers.ErrEntityNotConfirmed):
			http.Error(w, "one or more linked entities not confirmed", http.StatusUnprocessableEntity)
		case errors.Is(err, lers.ErrProviderInactive):
			http.Error(w, "provider inactive", http.StatusConflict)
		default:
			http.Error(w, "failed to create request", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{"legal_request": req})
}

func (h *LegalRequestHandler) GetLegalRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid request ID", http.StatusBadRequest)
		return
	}

	req, events, err := h.repo.GetByID(ctx, id)
	if err != nil {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}

	resp := map[string]any{
		"legal_request": req,
		"dispatch_events": events,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *LegalRequestHandler) ApproveLegalRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid request ID", http.StatusBadRequest)
		return
	}

	var body ApproveLegalRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req, err := h.service.ApproveRequest(ctx, id, body.ApprovedBy)
	if err != nil {
		switch {
		case errors.Is(err, lers.ErrInvalidStatus):
			http.Error(w, "request is not in drafted state", http.StatusConflict)
		default:
			http.Error(w, "failed to approve request", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"legal_request": req})
}

func (h *LegalRequestHandler) StatusSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	caseIDStr := chi.URLParam(r, "caseId")
	caseID, err := uuid.Parse(caseIDStr)
	if err != nil {
		http.Error(w, "invalid case ID", http.StatusBadRequest)
		return
	}

	summary, err := h.repo.StatusSummary(ctx, caseID)
	if err != nil {
		http.Error(w, "failed to get status summary", http.StatusInternalServerError)
		return
	}

	total := 0
	for _, count := range summary {
		total += count
	}

	resp := map[string]any{
		"by_status": summary,
		"total":     total,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *LegalRequestHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	caseIDStr := chi.URLParam(r, "caseId")
	caseID, err := uuid.Parse(caseIDStr)
	if err != nil {
		http.Error(w, "invalid case ID", http.StatusBadRequest)
		return
	}

	requestsWithEvents, err := h.repo.ListWithTimeline(ctx, caseID)
	if err != nil {
		http.Error(w, "failed to get timeline", http.StatusInternalServerError)
		return
	}

	resp := map[string]any{
		"requests": requestsWithEvents,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
