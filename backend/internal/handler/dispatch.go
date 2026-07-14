
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/dispatch"
	"crimeos/digitalfootprint/internal/lers"
)

type DispatchHandler struct {
	lersRepo    *lers.Repository
	dispatchRepo *dispatch.Repository
	queue       *dispatch.Queue
}

func NewDispatchHandler(lersRepo *lers.Repository, dispatchRepo *dispatch.Repository, queue *dispatch.Queue) *DispatchHandler {
	return &DispatchHandler{
		lersRepo:    lersRepo,
		dispatchRepo: dispatchRepo,
		queue:       queue,
	}
}

func (h *DispatchHandler) DispatchLegalRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid request ID", http.StatusBadRequest)
		return
	}

	req, _, err := h.lersRepo.GetByID(ctx, id)
	if err != nil {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}

	if req.Status != "QUEUED" {
		http.Error(w, "request is not in queued state", http.StatusConflict)
		return
	}

	job := dispatch.Job{LegalRequestID: id}
	if err := h.queue.Enqueue(job); err != nil {
		http.Error(w, "dispatch queue full", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"message":           "request queued for dispatch",
		"legal_request_id": id,
	})
}

func (h *DispatchHandler) ListDispatchEvents(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid request ID", http.StatusBadRequest)
		return
	}

	events, err := h.dispatchRepo.ListEvents(ctx, id)
	if err != nil {
		http.Error(w, "failed to list events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"events": events})
}

func (h *DispatchHandler) ListLegalRequestsByStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	caseIDStr := chi.URLParam(r, "caseId")
	caseID, err := uuid.Parse(caseIDStr)
	if err != nil {
		http.Error(w, "invalid case ID", http.StatusBadRequest)
		return
	}

	status := r.URL.Query().Get("status")
	var statusPtr *string
	if status != "" {
		statusPtr = &status
	}

	requests, err := h.lersRepo.ListByCaseAndStatus(ctx, caseID, statusPtr)
	if err != nil {
		http.Error(w, "failed to list requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"legal_requests": requests})
}
