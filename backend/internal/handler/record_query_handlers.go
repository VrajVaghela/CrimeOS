
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/analytics"
)

// RecordQueryHandler handles record query endpoints
type RecordQueryHandler struct {
	analyticsRepo *analytics.Repository
}

// NewRecordQueryHandler creates a new RecordQueryHandler
func NewRecordQueryHandler(analyticsRepo *analytics.Repository) *RecordQueryHandler {
	return &RecordQueryHandler{
		analyticsRepo: analyticsRepo,
	}
}

// ListCDRRecords handles GET /api/v1/legal-requests/{id}/cdr-records
func (h *RecordQueryHandler) ListCDRRecords(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	reqID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid legal request id", http.StatusBadRequest)
		return
	}

	page := parseQueryInt(r, "page", 1)
	limit := parseQueryInt(r, "limit", 50)

	result, err := h.analyticsRepo.ListCDRRecords(r.Context(), reqID, page, limit)
	if err != nil {
		http.Error(w, "failed to list CDR records", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"records": result.Records,
		"total":   result.Total,
	})
}

// ListIPSessionRecords handles GET /api/v1/legal-requests/{id}/ip-session-records
func (h *RecordQueryHandler) ListIPSessionRecords(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	reqID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid legal request id", http.StatusBadRequest)
		return
	}

	page := parseQueryInt(r, "page", 1)
	limit := parseQueryInt(r, "limit", 50)

	result, err := h.analyticsRepo.ListIPSessionRecords(r.Context(), reqID, page, limit)
	if err != nil {
		http.Error(w, "failed to list IP session records", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"records": result.Records,
		"total":   result.Total,
	})
}

// ListBankTransactionRecords handles GET /api/v1/legal-requests/{id}/bank-transaction-records
func (h *RecordQueryHandler) ListBankTransactionRecords(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	reqID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid legal request id", http.StatusBadRequest)
		return
	}

	page := parseQueryInt(r, "page", 1)
	limit := parseQueryInt(r, "limit", 50)

	result, err := h.analyticsRepo.ListBankTransactionRecords(r.Context(), reqID, page, limit)
	if err != nil {
		http.Error(w, "failed to list bank transaction records", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"records": result.Records,
		"total":   result.Total,
	})
}

func parseQueryInt(r *http.Request, key string, defaultValue int) int {
	valStr := r.URL.Query().Get(key)
	if valStr == "" {
		return defaultValue
	}
	val, err := strconv.Atoi(valStr)
	if err != nil || val < 1 {
		return defaultValue
	}
	return val
}
