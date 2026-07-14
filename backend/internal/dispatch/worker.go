
package dispatch

import (
	"context"
	"log/slog"
	"time"

	"crimeos/digitalfootprint/internal/lers"
)

const maxRetries = 3

// RunWorker runs the dispatch worker loop that processes jobs from the queue
func RunWorker(ctx context.Context, q *Queue, lersRepo *lers.Repository, dispatchRepo *Repository) {
	for {
		select {
		case <-ctx.Done():
			slog.Info("dispatch worker stopping")
			return
		case job := <-q.Jobs():
			slog.Info("processing dispatch job", "legal_request_id", job.LegalRequestID)
			processJob(ctx, job, lersRepo, dispatchRepo)
		}
	}
}

func processJob(ctx context.Context, job Job, lersRepo *lers.Repository, dispatchRepo *Repository) {
	req, _, err := lersRepo.GetByID(ctx, job.LegalRequestID)
	if err != nil {
		slog.Error("failed to get legal request", "legal_request_id", job.LegalRequestID, "error", err)
		return
	}

	if req.Status != "QUEUED" {
		slog.Warn("request not in QUEUED state, skipping", "legal_request_id", req.ID, "status", req.Status)
		return
	}

	// Record QUEUED event if not already recorded
	// (we'll assume the handler already recorded it, but just in case)

	provider, err := lersRepo.GetProviderByID(ctx, req.ProviderID)
	if err != nil {
		slog.Error("failed to get provider", "legal_request_id", req.ID, "error", err)
		return
	}

	// Simulate SMTP send
	success, detail, err := SimulateSMTPSend(ctx, req, *provider)
	if err != nil {
		slog.Error("simulate send failed", "legal_request_id", req.ID, "error", err)
		return
	}

	if success {
		// Success: update status to SENT and record event
		_, err := lersRepo.UpdateStatus(ctx, req.ID, "SENT", nil, nil)
		if err != nil {
			slog.Error("failed to update status to SENT", "legal_request_id", req.ID, "error", err)
			return
		}
		if err := dispatchRepo.RecordEvent(ctx, req.ID, "SMTP_SENT", detail); err != nil {
			slog.Error("failed to record SMTP_SENT event", "error", err)
		}

		// Simulate acknowledgment after a short delay
		go func() {
			delay := time.Duration(2 + time.Now().UnixNano()%3) * time.Second
			time.Sleep(delay)
			// Use background context in case worker ctx is cancelled
			_, err := lersRepo.UpdateStatus(context.Background(), req.ID, "ACKNOWLEDGED", nil, nil)
			if err != nil {
				slog.Error("failed to update status to ACKNOWLEDGED", "legal_request_id", req.ID, "error", err)
				return
			}
			if err := dispatchRepo.RecordEvent(context.Background(), req.ID, "ACK_RECEIVED", map[string]any{"note": "provider acknowledged receipt"}); err != nil {
				slog.Error("failed to record ACK_RECEIVED event", "error", err)
			}
		}()
	} else {
		// Failure: check retry count
		failCount, err := dispatchRepo.CountFailedEvents(ctx, req.ID)
		if err != nil {
			slog.Error("failed to count failed events", "legal_request_id", req.ID, "error", err)
			return
		}

		if err := dispatchRepo.RecordEvent(ctx, req.ID, "SMTP_FAILED", detail); err != nil {
			slog.Error("failed to record SMTP_FAILED event", "error", err)
		}

		if failCount+1 >= maxRetries {
			// Max retries reached: mark as REJECTED_BY_PROVIDER
			_, err := lersRepo.UpdateStatus(ctx, req.ID, "REJECTED_BY_PROVIDER", nil, nil)
			if err != nil {
				slog.Error("failed to update status to REJECTED_BY_PROVIDER", "legal_request_id", req.ID, "error", err)
				return
			}
			if err := dispatchRepo.RecordEvent(ctx, req.ID, "REJECTED_BY_PROVIDER", map[string]any{"note": "max retries reached"}); err != nil {
				slog.Error("failed to record REJECTED_BY_PROVIDER event", "error", err)
			}
		}
	}
}

