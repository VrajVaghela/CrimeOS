
package dispatch

import (
	"context"
	"log/slog"
	"time"

	"crimeos/digitalfootprint/internal/lers"
)

// RunOverdueSweeper runs a periodic ticker that marks requests as OVERDUE
func RunOverdueSweeper(ctx context.Context, repo *lers.Repository, dispatchRepo *Repository, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("overdue sweeper stopping")
			return
		case <-ticker.C:
			sweepOverdue(ctx, repo, dispatchRepo)
		}
	}
}

func sweepOverdue(ctx context.Context, repo *lers.Repository, dispatchRepo *Repository) {
	updatedIDs, err := repo.MarkOverdue(ctx)
	if err != nil {
		slog.Error("failed to mark overdue requests", "error", err)
		return
	}
	if len(updatedIDs) > 0 {
		slog.Info("marked requests as overdue", "count", len(updatedIDs))
		for _, id := range updatedIDs {
			if err := dispatchRepo.RecordEvent(ctx, id, "OVERDUE_MARKED", map[string]any{"note": "sla deadline exceeded"}); err != nil {
				slog.Error("failed to record OVERDUE_MARKED event", "legal_request_id", id, "error", err)
			}
		}
	}
}

