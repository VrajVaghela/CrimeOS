
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/audit"
	"crimeos/digitalfootprint/internal/entity"
	"crimeos/digitalfootprint/internal/middleware"
)

type ExtractEntitiesRequest struct {
	SourceText     string     `json:"source_text"`
	ComplaintRefID *uuid.UUID `json:"complaint_ref_id,omitempty"`
}

type UpdateEntityStatusRequest struct {
	Status string `json:"status"`
}

func ExtractEntities(svc *entity.Service, auditRepo *audit.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		caseIDStr := chi.URLParam(r, "caseId")
		caseID, err := uuid.Parse(caseIDStr)
		if err != nil {
			http.Error(w, "invalid case_id", http.StatusBadRequest)
			return
		}

		var req ExtractEntitiesRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if req.SourceText == "" {
			http.Error(w, "source_text is required", http.StatusBadRequest)
			return
		}

		actorID := r.Context().Value(middleware.ActorIDKey).(string)

		entities, err := svc.ExtractAndPersist(r.Context(), caseID, req.ComplaintRefID, req.SourceText, actorID)
		if err != nil {
			http.Error(w, "failed to extract entities", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{"entities": entities})
	}
}

func ListEntities(repo *entity.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		caseIDStr := chi.URLParam(r, "caseId")
		caseID, err := uuid.Parse(caseIDStr)
		if err != nil {
			http.Error(w, "invalid case_id", http.StatusBadRequest)
			return
		}

		statusFilter := r.URL.Query().Get("status")
		typeFilter := r.URL.Query().Get("type")

		entities, total, err := repo.ListByCaseFiltered(r.Context(), caseID, statusFilter, typeFilter)
		if err != nil {
			http.Error(w, "failed to list entities", http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{"entities": entities, "total": total})
	}
}

func UpdateEntityStatus(repo *entity.Repository, auditRepo *audit.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entityIDStr := chi.URLParam(r, "entityId")
		entityID, err := uuid.Parse(entityIDStr)
		if err != nil {
			http.Error(w, "invalid entity_id", http.StatusBadRequest)
			return
		}

		var req UpdateEntityStatusRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.Status != "CONFIRMED" && req.Status != "REJECTED" {
			http.Error(w, "invalid status", http.StatusBadRequest)
			return
		}

		before, err := repo.GetByID(r.Context(), entityID)
		if err != nil {
			http.Error(w, "entity not found", http.StatusNotFound)
			return
		}

		// Validate status transition: if already CONFIRMED, can only go to REJECTED
		if before.Status == "CONFIRMED" && req.Status == "EXTRACTED" {
			http.Error(w, "invalid status transition", http.StatusUnprocessableEntity)
			return
		}

		after, err := repo.UpdateStatus(r.Context(), entityID, req.Status)
		if err != nil {
			http.Error(w, "failed to update entity", http.StatusInternalServerError)
			return
		}

		// Record audit log
		actorID := r.Context().Value(middleware.ActorIDKey).(string)
		ipAddress := r.RemoteAddr
		_ = auditRepo.Record(r.Context(), actorID, "ENTITY_STATUS_UPDATED", "digital_entities", &entityID, before, after, ipAddress)

		_ = json.NewEncoder(w).Encode(map[string]any{"entity": after})
	}
}
