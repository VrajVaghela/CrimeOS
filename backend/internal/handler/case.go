package handler

import (
	"encoding/json"
	"net/http"

	"crimeos/digitalfootprint/internal/cases"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type CasesHandler struct {
	repo *cases.Repository
}

func NewCasesHandler(repo *cases.Repository) *CasesHandler {
	return &CasesHandler{repo: repo}
}

func (h *CasesHandler) ApiHome(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CrimeOS Digital Footprint API</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #f5f7fb; color: #111827; }
    .page { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
    .heading { margin: 0 0 1rem; font-size: 2rem; line-height: 1.1; }
    .description { margin: 0 0 1.75rem; color: #475569; }
    .button { display: inline-flex; align-items: center; justify-content: center; padding: 0.85rem 1.4rem; border-radius: 9999px; border: none; color: white; background: #2563eb; cursor: pointer; font-size: 1rem; }
    .button:disabled { opacity: 0.65; cursor: not-allowed; }
    .field { width: 100%; padding: 0.85rem 1rem; border: 1px solid #cbd5e1; border-radius: 12px; margin-top: 0.75rem; font-size: 1rem; }
    .label { display: block; margin-top: 1.5rem; font-weight: 600; color: #0f172a; }
    .notice { margin-top: 1rem; color: #475569; }
    .result { margin-top: 1rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1 class="heading">CrimeOS Digital Footprint API</h1>
      <p class="description">Create a new investigation case and open its API endpoint.</p>

      <button id="createCaseButton" class="button">Create new case</button>
      <div id="result" class="result" style="display:none;"></div>

      <label class="label" for="existingCaseId">Open an existing case</label>
      <input id="existingCaseId" class="field" type="text" placeholder="Enter case UUID" />
      <button id="openCaseButton" class="button" style="margin-top:0.75rem;">Open case</button>

      <p class="notice">After creating a case, you will be redirected to <code>/api/v1/cases/{caseId}</code>.</p>
    </div>
  </div>

  <script>
    const createButton = document.getElementById('createCaseButton');
    const openButton = document.getElementById('openCaseButton');
    const existingCaseId = document.getElementById('existingCaseId');
    const result = document.getElementById('result');

    createButton.addEventListener('click', async () => {
      createButton.disabled = true;
      result.style.display = 'none';
      try {
        const response = await fetch('/api/v1/cases', { method: 'POST' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to create case');
        const caseId = body.case?.id;
        if (!caseId) throw new Error('Case ID missing');
        window.location.href = '/api/v1/cases/' + caseId;
      } catch (error) {
        result.style.display = 'block';
        result.textContent = error.message;
      } finally {
        createButton.disabled = false;
      }
    });

    openButton.addEventListener('click', () => {
      const caseId = existingCaseId.value.trim();
      if (!caseId) return;
      window.location.href = '/api/v1/cases/' + encodeURIComponent(caseId);
    });
  </script>
</body>
</html>`))
}

func (h *CasesHandler) CreateCase(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	c, err := h.repo.Create(ctx)
	if err != nil {
		http.Error(w, "failed to create case", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{"case": c})
}

func (h *CasesHandler) GetCase(w http.ResponseWriter, r *http.Request) {
	caseIDStr := chi.URLParam(r, "caseId")
	caseID, err := uuid.Parse(caseIDStr)
	if err != nil {
		http.Error(w, "invalid case ID", http.StatusBadRequest)
		return
	}

	c, err := h.repo.GetByID(r.Context(), caseID)
	if err != nil {
		if err == cases.ErrCaseNotFound {
			http.Error(w, "case not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to load case", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"case": c})
}
