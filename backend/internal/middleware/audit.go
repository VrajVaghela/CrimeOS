
package middleware

import (
	"context"
	"net/http"

	"crimeos/digitalfootprint/internal/audit"
)

const ActorIDKey contextKey = "actor_id"

func AuditWrap(auditRepo *audit.Repository, action, resourceType string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// TODO: Replace X-Officer-Id header with real JWT-based auth integration
			actorID := r.Header.Get("X-Officer-Id")
			if actorID == "" {
				actorID = "unknown"
			}

			ctx := context.WithValue(r.Context(), ActorIDKey, actorID)

			lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(lrw, r.WithContext(ctx))

			ipAddress := r.RemoteAddr
			var finalAction string

			if lrw.statusCode >= 200 && lrw.statusCode < 300 {
				finalAction = action
			} else {
				finalAction = action + "_FAILED"
			}

			// Extract resource ID if applicable (for now, will be passed differently per handler, maybe later via context?)
			// For now, just log without resource ID
			if err := auditRepo.Record(r.Context(), actorID, finalAction, resourceType, nil, nil, nil, ipAddress); err != nil {
				// Log error but don't fail the request
				// slog.Error("failed to record audit log", "error", err)
			}
		})
	}
}
