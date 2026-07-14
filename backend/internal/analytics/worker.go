
package analytics

import (
	"context"
	"log/slog"
	"os"

	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/caselog"
	"crimeos/digitalfootprint/internal/lers"
)

// RunParseWorker runs the async worker to process parse jobs
func RunParseWorker(
	ctx context.Context,
	q *Queue,
	mongoRepo *MongoRepository,
	pgRepo *Repository,
	lersRepo *lers.Repository,
	caseLogPublisher caselog.Publisher,
) {
	for {
		select {
		case <-ctx.Done():
			slog.Info("parse worker stopping")
			return
		case job := <-q.Jobs():
			slog.Info("processing parse job", "dump_id", job.DumpID)
			processParseJob(ctx, job, mongoRepo, pgRepo, lersRepo, caseLogPublisher)
		}
	}
}

func processParseJob(
	ctx context.Context,
	job ParseJob,
	mongoRepo *MongoRepository,
	pgRepo *Repository,
	lersRepo *lers.Repository,
	caseLogPublisher caselog.Publisher,
) {
	// 1. Load raw dump
	dump, err := mongoRepo.GetDump(ctx, job.DumpID)
	if err != nil {
		slog.Error("failed to load dump", "dump_id", job.DumpID, "error", err)
		return
	}

	// 2. Update parse status to PARSING
	if err := mongoRepo.UpdateParseStatus(ctx, job.DumpID, ParseStatusParsing, 0, 0, nil); err != nil {
		slog.Error("failed to set parse status to PARSING", "dump_id", job.DumpID, "error", err)
		return
	}

	// 3. Load legal request
	legalReqID, err := uuid.Parse(dump.LegalRequestID)
	if err != nil {
		slog.Error("invalid legal request id in dump", "dump_id", job.DumpID, "error", err)
		markFailed(ctx, mongoRepo, job.DumpID, 0, 0, []ParseError{{Row: 0, Reason: "invalid legal request id"}})
		return
	}

	req, _, err := lersRepo.GetByID(ctx, legalReqID)
	if err != nil {
		slog.Error("failed to load legal request", "legal_request_id", legalReqID, "error", err)
		markFailed(ctx, mongoRepo, job.DumpID, 0, 0, []ParseError{{Row: 0, Reason: "failed to load legal request"}})
		return
	}
	caseID := req.CaseID

	// 4. Select parser
	parser, err := SelectParser(req.TemplateType)
	if err != nil {
		slog.Info("no parser available for template type, skipping parse", "template_type", req.TemplateType)
		markFailed(ctx, mongoRepo, job.DumpID, 0, 0, []ParseError{{Row: 0, Reason: "no parser for template type: " + req.TemplateType}})
		return
	}

	// 5. Open file from disk
	file, err := os.Open(dump.FileMeta.StoragePath)
	if err != nil {
		slog.Error("failed to open file from storage", "path", dump.FileMeta.StoragePath, "error", err)
		markFailed(ctx, mongoRepo, job.DumpID, 0, 0, []ParseError{{Row: 0, Reason: "failed to open file: " + err.Error()}})
		return
	}
	defer file.Close()

	// 6. Parse
	parsedRows, parseErrs := parser.Parse(file)
	rowCountDetected := len(parseErrs) + len(parsedRows)
	rowCountParsed := len(parsedRows)

	// 7. Batch insert into Postgres
	inserted := false
	switch req.TemplateType {
	case "CDR_REQUEST":
		if err := pgRepo.InsertCDRRecords(ctx, legalReqID, job.DumpID, parsedRows); err == nil {
			inserted = true
		} else {
			slog.Error("failed to insert CDR records", "dump_id", job.DumpID, "error", err)
		}
	case "IP_LOG_REQUEST", "SUBSCRIBER_DETAILS_REQUEST":
		if err := pgRepo.InsertIPSessionRecords(ctx, legalReqID, job.DumpID, parsedRows); err == nil {
			inserted = true
		} else {
			slog.Error("failed to insert IP session records", "dump_id", job.DumpID, "error", err)
		}
	case "BANK_STATEMENT_REQUEST":
		if err := pgRepo.InsertBankTransactionRecords(ctx, legalReqID, job.DumpID, parsedRows); err == nil {
			inserted = true
		} else {
			slog.Error("failed to insert bank transaction records", "dump_id", job.DumpID, "error", err)
		}
	}

	// 8. Update parse status
	if inserted && len(parsedRows) > 0 {
		if err := mongoRepo.UpdateParseStatus(ctx, job.DumpID, ParseStatusParsed, rowCountDetected, rowCountParsed, parseErrs); err != nil {
			slog.Error("failed to set parse status to PARSED", "dump_id", job.DumpID, "error", err)
		} else {
			// 9. Update legal request status
			if _, err := lersRepo.UpdateStatus(ctx, legalReqID, "RESPONDED", nil, nil); err != nil {
				slog.Error("failed to set legal request status to RESPONDED", "legal_request_id", legalReqID, "error", err)
			} else {
				// 10. Run heuristics and insert flags
				flags, err := RunHeuristics(ctx, pgRepo, caseID, legalReqID, req.TemplateType, caseLogPublisher)
				if err != nil {
					slog.Error("failed to run heuristics", "legal_request_id", legalReqID, "error", err)
				} else if len(flags) > 0 {
					if err := pgRepo.BulkInsertFlags(ctx, flags); err != nil {
						slog.Error("failed to bulk insert flags", "legal_request_id", legalReqID, "error", err)
					}
				}
			}
		}
	} else {
		markFailed(ctx, mongoRepo, job.DumpID, rowCountDetected, rowCountParsed, parseErrs)
	}
}

func markFailed(ctx context.Context, mongoRepo *MongoRepository, dumpID string, detected, parsed int, errs []ParseError) {
	if err := mongoRepo.UpdateParseStatus(ctx, dumpID, ParseStatusFailed, detected, parsed, errs); err != nil {
		slog.Error("failed to set parse status to FAILED", "dump_id", dumpID, "error", err)
	}
}
