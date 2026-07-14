
package analytics

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"crimeos/digitalfootprint/internal/model"
)

// Repository handles Postgres operations for analytics
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository creates a new analytics repository
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// InsertCDRRecords batch inserts CDR records
func (r *Repository) InsertCDRRecords(ctx context.Context, legalRequestID uuid.UUID, dumpID string, rows []ParsedRow) error {
	batch := &pgx.Batch{}
	for _, row := range rows {
		caller := row["caller"].(string)
		callee := row["callee"].(string)
		callType := row["call_type"].(string)
		callStart := row["call_start"].(time.Time)
		durationSeconds := row["duration_seconds"].(int)
		cellTowerID, _ := row["cell_tower_id"].(string) // optional
		imei, _ := row["imei"].(string)
		imsi, _ := row["imsi"].(string)

		batch.Queue(
			`INSERT INTO cdr_records (
				id, legal_request_id, caller_number, callee_number, call_type, 
				call_start, duration_seconds, cell_tower_id, imei, imsi, raw_row_ref
			) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			legalRequestID, caller, callee, callType, callStart, durationSeconds, cellTowerID, imei, imsi, dumpID,
		)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(rows); i++ {
		_, err := br.Exec()
		if err != nil {
			return fmt.Errorf("batch insert cdr failed at index %d: %w", i, err)
		}
	}
	return nil
}

// InsertIPSessionRecords batch inserts IP session records
func (r *Repository) InsertIPSessionRecords(ctx context.Context, legalRequestID uuid.UUID, dumpID string, rows []ParsedRow) error {
	batch := &pgx.Batch{}
	for _, row := range rows {
		ipAddress := row["ip_address"].(string)
		accountIdentifier := row["account_identifier"].(string)
		sessionStart, _ := row["session_start"].(time.Time)
		sessionEnd, _ := row["session_end"].(time.Time)
		portNumber, _ := row["port_number"].(string)

		batch.Queue(
			`INSERT INTO ip_session_records (
				id, legal_request_id, ip_address, account_identifier, session_start, 
				session_end, port_number, raw_row_ref
			) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
			legalRequestID, ipAddress, accountIdentifier, sessionStart, sessionEnd, portNumber, dumpID,
		)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(rows); i++ {
		_, err := br.Exec()
		if err != nil {
			return fmt.Errorf("batch insert ip session failed at index %d: %w", i, err)
		}
	}
	return nil
}

// InsertBankTransactionRecords batch inserts bank transaction records
func (r *Repository) InsertBankTransactionRecords(ctx context.Context, legalRequestID uuid.UUID, dumpID string, rows []ParsedRow) error {
	batch := &pgx.Batch{}
	for _, row := range rows {
		txnRef := row["txn_ref"].(string)
		txnDate := row["txn_date"].(time.Time)
		amount := row["amount"].(string) // store as string for precision
		txnType := row["txn_type"].(string)
		counterpartyAccount, _ := row["counterparty_account"].(string)
		counterpartyUPI, _ := row["counterparty_upi"].(string)
		narration, _ := row["narration"].(string)

		batch.Queue(
			`INSERT INTO bank_transaction_records (
				id, legal_request_id, txn_ref, txn_date, amount, txn_type, 
				counterparty_account, counterparty_upi, narration, raw_row_ref
			) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			legalRequestID, txnRef, txnDate, amount, txnType, counterpartyAccount, counterpartyUPI, narration, dumpID,
		)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(rows); i++ {
		_, err := br.Exec()
		if err != nil {
			return fmt.Errorf("batch insert bank transaction failed at index %d: %w", i, err)
		}
	}
	return nil
}

// PaginatedResult holds paginated records and total count
type PaginatedResult[T any] struct {
	Records []T
	Total   int
}

// ListCDRRecords lists CDR records for a legal request with pagination
func (r *Repository) ListCDRRecords(ctx context.Context, legalRequestID uuid.UUID, page, limit int) (*PaginatedResult[model.CDRRecord], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, caller_number, callee_number, call_type, 
			   call_start, duration_seconds, cell_tower_id, imei, imsi, raw_row_ref, created_at,
			   COUNT(*) OVER() AS total
		FROM cdr_records
		WHERE legal_request_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, legalRequestID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list cdr records: %w", err)
	}
	defer rows.Close()

	var records []model.CDRRecord
	var total int
	for rows.Next() {
		var rec model.CDRRecord
		var cellTowerID, imei, imsi *string
		if err := rows.Scan(
			&rec.ID, &rec.LegalRequestID, &rec.CallerNumber, &rec.CalleeNumber, &rec.CallType,
			&rec.CallStart, &rec.DurationSeconds, &cellTowerID, &imei, &imsi, &rec.RawRowRef, &rec.CreatedAt,
			&total,
		); err != nil {
			return nil, fmt.Errorf("scan cdr record: %w", err)
		}
		rec.CellTowerID = cellTowerID
		rec.IMEI = imei
		rec.IMSI = imsi
		records = append(records, rec)
	}
	return &PaginatedResult[model.CDRRecord]{Records: records, Total: total}, nil
}

// ListIPSessionRecords lists IP session records for a legal request with pagination
func (r *Repository) ListIPSessionRecords(ctx context.Context, legalRequestID uuid.UUID, page, limit int) (*PaginatedResult[model.IPSessionRecord], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, ip_address, account_identifier, 
			   session_start, session_end, port_number, raw_row_ref, created_at,
			   COUNT(*) OVER() AS total
		FROM ip_session_records
		WHERE legal_request_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, legalRequestID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list ip records: %w", err)
	}
	defer rows.Close()

	var records []model.IPSessionRecord
	var total int
	for rows.Next() {
		var rec model.IPSessionRecord
		var sessionStart, sessionEnd *time.Time
		var portNumber *string
		if err := rows.Scan(
			&rec.ID, &rec.LegalRequestID, &rec.IPAddress, &rec.AccountIdentifier,
			&sessionStart, &sessionEnd, &portNumber, &rec.RawRowRef, &rec.CreatedAt,
			&total,
		); err != nil {
			return nil, fmt.Errorf("scan ip record: %w", err)
		}
		rec.SessionStart = sessionStart
		rec.SessionEnd = sessionEnd
		rec.PortNumber = portNumber
		records = append(records, rec)
	}
	return &PaginatedResult[model.IPSessionRecord]{Records: records, Total: total}, nil
}

// ListBankTransactionRecords lists bank transaction records for a legal request with pagination
func (r *Repository) ListBankTransactionRecords(ctx context.Context, legalRequestID uuid.UUID, page, limit int) (*PaginatedResult[model.BankTransactionRecord], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, txn_ref, txn_date, amount, txn_type,
			   counterparty_account, counterparty_upi, narration, raw_row_ref, created_at,
			   COUNT(*) OVER() AS total
		FROM bank_transaction_records
		WHERE legal_request_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, legalRequestID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list txn records: %w", err)
	}
	defer rows.Close()

	var records []model.BankTransactionRecord
	var total int
	for rows.Next() {
		var rec model.BankTransactionRecord
		var cpAcct, cpUPI, narration *string
		if err := rows.Scan(
			&rec.ID, &rec.LegalRequestID, &rec.TxnRef, &rec.TxnDate, &rec.Amount, &rec.TxnType,
			&cpAcct, &cpUPI, &narration, &rec.RawRowRef, &rec.CreatedAt,
			&total,
		); err != nil {
			return nil, fmt.Errorf("scan txn record: %w", err)
		}
		rec.CounterpartyAccount = cpAcct
		rec.CounterpartyUPI = cpUPI
		rec.Narration = narration
		records = append(records, rec)
	}
	return &PaginatedResult[model.BankTransactionRecord]{Records: records, Total: total}, nil
}

// ListAllCDRRecords lists all CDR records (used for heuristics, no pagination)
func (r *Repository) ListAllCDRRecords(ctx context.Context, legalRequestID uuid.UUID) ([]model.CDRRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, caller_number, callee_number, call_type, 
			   call_start, duration_seconds, cell_tower_id, imei, imsi, raw_row_ref, created_at
		FROM cdr_records
		WHERE legal_request_id = $1
	`, legalRequestID)
	if err != nil {
		return nil, fmt.Errorf("list all cdr records: %w", err)
	}
	defer rows.Close()

	var records []model.CDRRecord
	for rows.Next() {
		var rec model.CDRRecord
		var cellTowerID, imei, imsi *string
		if err := rows.Scan(
			&rec.ID, &rec.LegalRequestID, &rec.CallerNumber, &rec.CalleeNumber, &rec.CallType,
			&rec.CallStart, &rec.DurationSeconds, &cellTowerID, &imei, &imsi, &rec.RawRowRef, &rec.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan cdr record: %w", err)
		}
		rec.CellTowerID = cellTowerID
		rec.IMEI = imei
		rec.IMSI = imsi
		records = append(records, rec)
	}
	return records, nil
}

// ListAllIPSessionRecords lists all IP session records (used for heuristics, no pagination)
func (r *Repository) ListAllIPSessionRecords(ctx context.Context, legalRequestID uuid.UUID) ([]model.IPSessionRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, ip_address, account_identifier, 
			   session_start, session_end, port_number, raw_row_ref, created_at
		FROM ip_session_records
		WHERE legal_request_id = $1
	`, legalRequestID)
	if err != nil {
		return nil, fmt.Errorf("list all ip records: %w", err)
	}
	defer rows.Close()

	var records []model.IPSessionRecord
	for rows.Next() {
		var rec model.IPSessionRecord
		var sessionStart, sessionEnd *time.Time
		var portNumber *string
		if err := rows.Scan(
			&rec.ID, &rec.LegalRequestID, &rec.IPAddress, &rec.AccountIdentifier,
			&sessionStart, &sessionEnd, &portNumber, &rec.RawRowRef, &rec.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan ip record: %w", err)
		}
		rec.SessionStart = sessionStart
		rec.SessionEnd = sessionEnd
		rec.PortNumber = portNumber
		records = append(records, rec)
	}
	return records, nil
}

// ListAllBankTransactionRecords lists all bank transaction records (used for heuristics, no pagination)
func (r *Repository) ListAllBankTransactionRecords(ctx context.Context, legalRequestID uuid.UUID) ([]model.BankTransactionRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, legal_request_id, txn_ref, txn_date, amount, txn_type,
			   counterparty_account, counterparty_upi, narration, raw_row_ref, created_at
		FROM bank_transaction_records
		WHERE legal_request_id = $1
	`, legalRequestID)
	if err != nil {
		return nil, fmt.Errorf("list all txn records: %w", err)
	}
	defer rows.Close()

	var records []model.BankTransactionRecord
	for rows.Next() {
		var rec model.BankTransactionRecord
		var cpAcct, cpUPI, narration *string
		if err := rows.Scan(
			&rec.ID, &rec.LegalRequestID, &rec.TxnRef, &rec.TxnDate, &rec.Amount, &rec.TxnType,
			&cpAcct, &cpUPI, &narration, &rec.RawRowRef, &rec.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan txn record: %w", err)
		}
		rec.CounterpartyAccount = cpAcct
		rec.CounterpartyUPI = cpUPI
		rec.Narration = narration
		records = append(records, rec)
	}
	return records, nil
}
