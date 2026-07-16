package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"crimeos/digitalfootprint/internal/analytics"
	"crimeos/digitalfootprint/internal/audit"
	"crimeos/digitalfootprint/internal/caselog"
	"crimeos/digitalfootprint/internal/cases"
	"crimeos/digitalfootprint/internal/db"
	"crimeos/digitalfootprint/internal/dispatch"
	"crimeos/digitalfootprint/internal/entity"
	"crimeos/digitalfootprint/internal/handler"
	"crimeos/digitalfootprint/internal/lers"
	"crimeos/digitalfootprint/internal/middleware"
	"crimeos/digitalfootprint/internal/model"
	"crimeos/digitalfootprint/internal/osint"
)

func parseEnvInt(name string, defaultValue int) int {
	if value := os.Getenv(name); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			return parsed
		}
	}
	return defaultValue
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	ctx := context.Background()

	cfg, err := model.LoadConfig()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	pgPool, err := db.NewPostgresPool(ctx, cfg.PostgresDSN)
	if err != nil {
		slog.Error("failed to connect to postgres", "error", err)
		os.Exit(1)
	}
	defer pgPool.Close()
	slog.Info("connected to postgres")

	// Run migrations
	migrationsDir := "migrations"
	if err := db.RunMigrations(ctx, pgPool, migrationsDir); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	mongoClient, err := db.NewMongoClient(ctx, cfg.MongoURI)
	if err != nil {
		slog.Error("failed to connect to mongo", "error", err)
		os.Exit(1)
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = mongoClient.Disconnect(shutdownCtx)
		cancel()
	}()
	slog.Info("connected to mongo")

	r := chi.NewRouter()
	r.Use(middleware.CORSMiddleware)
	r.Use(middleware.LoggingMiddleware)
	r.Use(middleware.RecoveryMiddleware)

	r.Get("/api/v1/health", handler.HealthHandler(pgPool, mongoClient))

	// Initialize repositories and services
	entityRepo := entity.NewRepository(pgPool)
	entitySvc := entity.NewService(entityRepo)
	auditRepo := audit.NewRepository(pgPool)
	osintRepo := osint.NewRepository(pgPool)
	caseLogPublisher := caselog.NewPostgresPublisher(pgPool)
	casesRepo := cases.NewRepository(pgPool)
	casesHandler := handler.NewCasesHandler(casesRepo)

	// LERS engine, repo, service, handler
	lersEngine, err := lers.NewEngine()
	if err != nil {
		slog.Error("failed to initialize lers engine", "error", err)
		os.Exit(1)
	}
	lersRepo := lers.NewRepository(pgPool)
	lersSvc := lers.NewService(lersRepo, entityRepo, lersEngine, pgPool)
	lersHandler := handler.NewLegalRequestHandler(lersSvc, lersRepo)

	// Dispatch setup
	dispatchQueue := dispatch.NewQueue(100)
	dispatchRepo := dispatch.NewRepository(pgPool)
	dispatchHandler := handler.NewDispatchHandler(lersRepo, dispatchRepo, dispatchQueue)

	// Analytics setup
	uploadDestDir := os.Getenv("UPLOAD_DEST_DIR")
	if uploadDestDir == "" {
		uploadDestDir = "uploads"
	}
	storageCfg := analytics.NewStorageConfig(uploadDestDir, 0) // 0 means default 25MB
	analyticsMongoRepo := analytics.NewMongoRepository(mongoClient.Database(cfg.MongoDBName))
	analyticsPgRepo := analytics.NewRepository(pgPool)
	parseQueue := analytics.NewQueue(100)
	responseHandler := handler.NewResponseHandler(lersRepo, storageCfg, analyticsMongoRepo, parseQueue)
	intelFlagsHandler := handler.NewIntelligenceFlagsHandler(analyticsPgRepo)
	recordQueryHandler := handler.NewRecordQueryHandler(analyticsPgRepo)

	// API homepage and case routes
	r.Get("/api/v1", http.HandlerFunc(casesHandler.ApiHome))
	r.Method(http.MethodPost, "/api/v1/cases", http.HandlerFunc(casesHandler.CreateCase))
	r.Get("/api/v1/cases/{caseId}", http.HandlerFunc(casesHandler.GetCase))

	// Entity routes
	r.Method(http.MethodPost, "/api/v1/cases/{caseId}/entities/extract", middleware.AuditWrap(auditRepo, "ENTITIES_EXTRACTED", "digital_entities")(handler.ExtractEntities(entitySvc, auditRepo)))
	r.Get("/api/v1/cases/{caseId}/entities", handler.ListEntities(entityRepo))
	r.Get("/api/v1/cases/{caseId}/osint/{entityId}", handler.GetEntityOsintResult(osintRepo))
	r.Method(http.MethodPatch, "/api/v1/entities/{entityId}", middleware.AuditWrap(auditRepo, "ENTITY_STATUS_UPDATED", "digital_entities")(handler.UpdateEntityStatus(entityRepo, auditRepo, osintRepo)))

	// Legal request routes
	r.Get("/api/v1/service-providers", lersHandler.ListProviders)
	r.Method(http.MethodPost, "/api/v1/cases/{caseId}/legal-requests", middleware.AuditWrap(auditRepo, "LEGAL_REQUEST_DRAFTED", "legal_requests")(http.HandlerFunc(lersHandler.CreateLegalRequest)))
	r.Get("/api/v1/legal-requests/{id}", lersHandler.GetLegalRequest)
	r.Method(http.MethodPost, "/api/v1/legal-requests/{id}/approve", middleware.AuditWrap(auditRepo, "LEGAL_REQUEST_APPROVED", "legal_requests")(http.HandlerFunc(lersHandler.ApproveLegalRequest)))
	r.Get("/api/v1/cases/{caseId}/legal-requests/summary", lersHandler.StatusSummary)
	r.Get("/api/v1/cases/{caseId}/legal-requests/timeline", lersHandler.Timeline)

	// Dispatch routes
	r.Method(http.MethodPost, "/api/v1/legal-requests/{id}/dispatch", middleware.AuditWrap(auditRepo, "LEGAL_REQUEST_DISPATCHED", "legal_requests")(http.HandlerFunc(dispatchHandler.DispatchLegalRequest)))
	r.Get("/api/v1/legal-requests/{id}/dispatch-events", dispatchHandler.ListDispatchEvents)
	r.Get("/api/v1/cases/{caseId}/legal-requests", dispatchHandler.ListLegalRequestsByStatus)

	// Response upload routes
	r.Method(http.MethodPost, "/api/v1/legal-requests/{id}/responses", middleware.AuditWrap(auditRepo, "RESPONSE_UPLOADED", "legal_requests")(http.HandlerFunc(responseHandler.UploadResponse)))
	r.Get("/api/v1/legal-requests/{id}/responses/{dumpId}", responseHandler.GetResponseDump)

	// Intelligence flags route
	r.Get("/api/v1/cases/{caseId}/intelligence-flags", intelFlagsHandler.ListIntelligenceFlags)

	// Record query routes
	r.Get("/api/v1/legal-requests/{id}/cdr-records", recordQueryHandler.ListCDRRecords)
	r.Get("/api/v1/legal-requests/{id}/ip-session-records", recordQueryHandler.ListIPSessionRecords)
	r.Get("/api/v1/legal-requests/{id}/bank-transaction-records", recordQueryHandler.ListBankTransactionRecords)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	// Start background workers
	workerCtx, workerCancel := context.WithCancel(context.Background())
	go dispatch.RunWorker(workerCtx, dispatchQueue, lersRepo, dispatchRepo)
	go dispatch.RunOverdueSweeper(workerCtx, lersRepo, dispatchRepo, 5*time.Minute)
	go analytics.RunParseWorker(workerCtx, parseQueue, analyticsMongoRepo, analyticsPgRepo, lersRepo, caseLogPublisher)
	osintPollSeconds := parseEnvInt("OSINT_POLL_INTERVAL_SECONDS", 5)
	osintWorkerConcurrency := parseEnvInt("OSINT_WORKER_CONCURRENCY", 4)
	go osint.RunWorker(workerCtx, osintRepo, mongoClient.Database(cfg.MongoDBName), time.Duration(osintPollSeconds)*time.Second, osintWorkerConcurrency)
	slog.Info("started background workers")

	go func() {
		slog.Info("starting server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	workerCancel()
	slog.Info("shutting down background workers...")
	slog.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown failed", "error", err)
	}
	slog.Info("server stopped")
}
