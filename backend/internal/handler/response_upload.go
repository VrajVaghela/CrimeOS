
package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/analytics"
	"crimeos/digitalfootprint/internal/lers"
)

type ResponseHandler struct {
	lersRepo    *lers.Repository
	storageCfg  *analytics.StorageConfig
	mongoRepo   *analytics.MongoRepository
	parseQueue  *analytics.Queue
}

func NewResponseHandler(lersRepo *lers.Repository, storageCfg *analytics.StorageConfig, mongoRepo *analytics.MongoRepository, parseQueue *analytics.Queue) *ResponseHandler {
	return &ResponseHandler{
		lersRepo:   lersRepo,
		storageCfg: storageCfg,
		mongoRepo:  mongoRepo,
		parseQueue: parseQueue,
	}
}

func (h *ResponseHandler) UploadResponse(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	legalReqID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid legal request id", http.StatusBadRequest)
		return
	}

	// Check if legal request exists
	_, _, err = h.lersRepo.GetByID(ctx, legalReqID)
	if err != nil {
		http.Error(w, "legal request not found", http.StatusNotFound)
		return
	}

	// Parse multipart form (10MB max in memory)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file parameter missing", http.StatusBadRequest)
		return
	}

	// Save upload
	storagePath, sha256, err := analytics.SaveUpload(file, header, h.storageCfg)
	if err != nil {
		if err == analytics.ErrUnsupportedFileType {
			http.Error(w, "unsupported file type", http.StatusBadRequest)
		} else if err.Error() == "file too large" {
			http.Error(w, "file too large", http.StatusRequestEntityTooLarge)
		} else {
			http.Error(w, "failed to save upload", http.StatusInternalServerError)
		}
		return
	}

	// Get case ID from legal request (we need to load it again)
	req, _, err := h.lersRepo.GetByID(ctx, legalReqID)
	if err != nil {
		http.Error(w, "legal request not found", http.StatusNotFound)
		return
	}

	// Create mongo doc
	uploadedBy := r.Header.Get("X-Officer-Id") // Extract officer ID from header for demo
	if uploadedBy == "" {
		uploadedBy = "UNKNOWN"
	}
	dumpDoc := analytics.RawResponseDump{
		LegalRequestID: legalReqID.String(),
		CaseID:         req.CaseID.String(),
		FileMeta: analytics.FileMeta{
			OriginalFilename: header.Filename,
			MimeType:         header.Header.Get("Content-Type"),
			SizeBytes:        header.Size,
			StoragePath:      storagePath,
			SHA256:           sha256,
		},
		ParseStatus: analytics.ParseStatusPending,
		UploadedBy:  uploadedBy,
		UploadedAt:  time.Now(),
	}

	// Insert into mongo
	dumpID, err := h.mongoRepo.InsertDump(ctx, dumpDoc)
	if err != nil {
		http.Error(w, "failed to save dump metadata", http.StatusInternalServerError)
		return
	}

	// Enqueue parse job
	job := analytics.ParseJob{DumpID: dumpID}
	if err := h.parseQueue.Enqueue(job); err != nil {
		// Don't fail upload, just log and return 202
		http.Error(w, "upload succeeded but queue is full, parse will be retried later", http.StatusAccepted)
		return
	}

	// Response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"dump_id":     dumpID,
		"parse_status": analytics.ParseStatusPending,
	})
}

func (h *ResponseHandler) GetResponseDump(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "dumpId")
	dump, err := h.mongoRepo.GetDump(ctx, idStr)
	if err != nil {
		http.Error(w, "dump not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dump)
}

