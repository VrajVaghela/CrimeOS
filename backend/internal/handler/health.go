
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// HealthHandler returns a handler that checks PostgreSQL and MongoDB health.
func HealthHandler(pg *pgxpool.Pool, mg *mongo.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		status := map[string]string{
			"status":   "ok",
			"postgres": "up",
			"mongo":    "up",
		}
		httpStatus := http.StatusOK

		if err := pg.Ping(ctx); err != nil {
			status["status"] = "degraded"
			status["postgres"] = "down"
			httpStatus = http.StatusServiceUnavailable
		}

		if err := mg.Ping(ctx, readpref.Primary()); err != nil {
			status["status"] = "degraded"
			status["mongo"] = "down"
			httpStatus = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpStatus)
		_ = json.NewEncoder(w).Encode(status)
	}
}

