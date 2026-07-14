
package model

import (
	"time"

	"github.com/google/uuid"
)

type DigitalEntity struct {
	ID                uuid.UUID  `json:"id"`
	CaseID            uuid.UUID  `json:"case_id"`
	ComplaintRefID    *uuid.UUID `json:"complaint_ref_id,omitempty"`
	EntityType        string     `json:"entity_type"`
	RawValue          string     `json:"raw_value"`
	NormalizedValue   string     `json:"normalized_value"`
	SourceTextOffset  [2]int     `json:"source_text_offset"`
	ConfidenceScore   float64    `json:"confidence_score"`
	Status            string     `json:"status"`
	ExtractedBy       string     `json:"extracted_by"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type ServiceProvider struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	ProviderCategory  string    `json:"provider_category"`
	NodalOfficerEmail string    `json:"nodal_officer_email"`
	NodalOfficerPhone *string   `json:"nodal_officer_phone,omitempty"`
	SLAHours          int       `json:"sla_hours"`
	Active            bool      `json:"active"`
	CreatedAt         time.Time `json:"created_at"`
}

type LegalRequest struct {
	ID               uuid.UUID   `json:"id"`
	CaseID           uuid.UUID   `json:"case_id"`
	RequestNumber    string      `json:"request_number"`
	ProviderID       uuid.UUID   `json:"provider_id"`
	TemplateType     string      `json:"template_type"`
	LinkedEntityIDs  []uuid.UUID `json:"linked_entity_ids"`
	Status           string      `json:"status"`
	RenderedDocPath  *string     `json:"rendered_doc_path,omitempty"`
	DraftedBy        string      `json:"drafted_by"`
	ApprovedBy       *string     `json:"approved_by,omitempty"`
	SLADueAt         time.Time   `json:"sla_due_at"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

type DispatchEvent struct {
	ID               uuid.UUID      `json:"id"`
	LegalRequestID   uuid.UUID      `json:"legal_request_id"`
	EventName        string         `json:"event_name"`
	Details          map[string]any `json:"details"`
	CreatedAt        time.Time      `json:"created_at"`
}

type LegalRequestWithEvents struct {
	LegalRequest LegalRequest   `json:"legal_request"`
	Events       []DispatchEvent `json:"events"`
}

type IntelligenceFlag struct {
	ID              uuid.UUID `json:"id"`
	CaseID          uuid.UUID `json:"case_id"`
	LegalRequestID  uuid.UUID `json:"legal_request_id"`
	FlagType        string    `json:"flag_type"`
	Severity        string    `json:"severity"`
	Summary         string    `json:"summary"`
	RawRowRefs      []string  `json:"raw_row_refs"`
	RecordIDs       []uuid.UUID `json:"record_ids"`
	CreatedAt       time.Time `json:"created_at"`
}

type CDRRecord struct {
	ID               uuid.UUID  `json:"id"`
	LegalRequestID   uuid.UUID  `json:"legal_request_id"`
	CallerNumber     string     `json:"caller_number"`
	CalleeNumber     string     `json:"callee_number"`
	CallType         string     `json:"call_type"`
	CallStart        time.Time  `json:"call_start"`
	DurationSeconds  int        `json:"duration_seconds"`
	CellTowerID      *string    `json:"cell_tower_id,omitempty"`
	IMEI             *string    `json:"imei,omitempty"`
	IMSI             *string    `json:"imsi,omitempty"`
	RawRowRef        string     `json:"raw_row_ref"`
	CreatedAt        time.Time  `json:"created_at"`
}

type IPSessionRecord struct {
	ID               uuid.UUID  `json:"id"`
	LegalRequestID   uuid.UUID  `json:"legal_request_id"`
	IPAddress        string     `json:"ip_address"`
	AccountIdentifier string    `json:"account_identifier"`
	SessionStart     *time.Time `json:"session_start,omitempty"`
	SessionEnd       *time.Time `json:"session_end,omitempty"`
	PortNumber       *string    `json:"port_number,omitempty"`
	RawRowRef        string     `json:"raw_row_ref"`
	CreatedAt        time.Time  `json:"created_at"`
}

type BankTransactionRecord struct {
	ID                 uuid.UUID `json:"id"`
	LegalRequestID     uuid.UUID `json:"legal_request_id"`
	TxnRef             string    `json:"txn_ref"`
	TxnDate            time.Time `json:"txn_date"`
	Amount             string    `json:"amount"` // stored as string for precision
	TxnType            string    `json:"txn_type"` // CREDIT or DEBIT
	CounterpartyAccount *string   `json:"counterparty_account,omitempty"`
	CounterpartyUPI    *string   `json:"counterparty_upi,omitempty"`
	Narration          *string   `json:"narration,omitempty"`
	RawRowRef          string    `json:"raw_row_ref"`
	CreatedAt          time.Time `json:"created_at"`
}
