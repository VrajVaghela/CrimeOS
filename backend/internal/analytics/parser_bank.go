
package analytics

import (
	"encoding/csv"
	"io"
	"regexp"
	"strings"
	"time"
)

// BankStatementParser parses bank statement CSV files
type BankStatementParser struct{}

// Regex for UPI (duplicated here from internal/entity because it's unexported; matches [\w.\-]{2,256}@[a-zA-Z]{2,64})
var bankUpiPattern = regexp.MustCompile(`[\w.\-]{2,256}@[a-zA-Z]{2,64}`)

// Regex for checking numeric amount string
var numericAmountPattern = regexp.MustCompile(`^-?\d+(\.\d{1,2})?$`)

var bankColumnAliases = map[string][]string{
	"txn_ref":             {"txn_ref", "ref_no", "reference", "transaction_id", "txn_id"},
	"txn_date":            {"txn_date", "date", "transaction_date", "value_date"},
	"amount":              {"amount", "amt", "debit_credit", "transaction_amount"},
	"txn_type":            {"txn_type", "type", "cr_dr", "debit_credit", "credit_debit"},
	"counterparty_account": {"counterparty_account", "account", "to_account", "from_account"},
	"counterparty_upi":    {"counterparty_upi", "upi_id", "upi", "vpa"},
	"narration":           {"narration", "description", "remark", "note"},
}

// Parse parses a bank statement CSV
func (p *BankStatementParser) Parse(r io.Reader) ([]ParsedRow, []ParseError) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1

	rawRows, err := reader.ReadAll()
	if err != nil {
		return nil, []ParseError{{Row: 0, Reason: "failed to read CSV: " + err.Error()}}
	}

	if len(rawRows) < 1 {
		return nil, []ParseError{{Row: 0, Reason: "empty file"}}
	}

	headerIndex := make(map[string]int)
	for i, col := range rawRows[0] {
		headerIndex[strings.ToLower(strings.TrimSpace(col))] = i
	}

	colIndices := make(map[string]int)
	for canonical, aliases := range bankColumnAliases {
		for _, alias := range aliases {
			if idx, ok := headerIndex[strings.ToLower(alias)]; ok {
				colIndices[canonical] = idx
				break
			}
		}
	}

	var rows []ParsedRow
	var errs []ParseError

	for i := 1; i < len(rawRows); i++ {
		rawRow := rawRows[i]
		parsed := ParsedRow{}
		valid := true

		// Txn ref
		if txnRefIdx, ok := colIndices["txn_ref"]; ok && txnRefIdx < len(rawRow) {
			parsed["txn_ref"] = strings.TrimSpace(rawRow[txnRefIdx])
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing txn_ref column"})
			valid = false
		}

		// Txn date
		var txnDate time.Time
		txnDateFound := false
		if txnDateIdx, ok := colIndices["txn_date"]; ok && txnDateIdx < len(rawRow) {
			txnDateStr := strings.TrimSpace(rawRow[txnDateIdx])
			for _, format := range []string{"2006-01-02 15:04:05", "02-01-2006", "02/01/2006", time.RFC3339} {
				t, err := time.Parse(format, txnDateStr)
				if err == nil {
					txnDate = t
					txnDateFound = true
					break
				}
			}
			if txnDateFound {
				parsed["txn_date"] = txnDate
			} else {
				errs = append(errs, ParseError{Row: i, Reason: "invalid txn_date format: " + txnDateStr})
				valid = false
			}
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing txn_date column"})
			valid = false
		}

		// Amount (must be numeric string)
		var amountStr string
		if amountIdx, ok := colIndices["amount"]; ok && amountIdx < len(rawRow) {
			amountStr = strings.TrimSpace(rawRow[amountIdx])
			if !numericAmountPattern.MatchString(amountStr) {
				errs = append(errs, ParseError{Row: i, Reason: "invalid amount (non-numeric): " + amountStr})
				valid = false
			} else {
				parsed["amount"] = amountStr
			}
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing amount column"})
			valid = false
		}

		// Txn type (normalize to CREDIT/DEBIT)
		if txnTypeIdx, ok := colIndices["txn_type"]; ok && txnTypeIdx < len(rawRow) {
			txnTypeStr := strings.ToUpper(strings.TrimSpace(rawRow[txnTypeIdx]))
			switch txnTypeStr {
			case "CREDIT", "CR":
				parsed["txn_type"] = "CREDIT"
			case "DEBIT", "DR":
				parsed["txn_type"] = "DEBIT"
			default:
				// If it's not one of the expected, check if amount has sign
				// Optional: for now just use as is, but let's comment
				parsed["txn_type"] = txnTypeStr
			}
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing txn_type column"})
			valid = false
		}

		// Optional fields
		if cpAcctIdx, ok := colIndices["counterparty_account"]; ok && cpAcctIdx < len(rawRow) {
			parsed["counterparty_account"] = strings.TrimSpace(rawRow[cpAcctIdx])
		}
		if cpUpiIdx, ok := colIndices["counterparty_upi"]; ok && cpUpiIdx < len(rawRow) {
			upiStr := strings.TrimSpace(rawRow[cpUpiIdx])
			if upiStr != "" && !bankUpiPattern.MatchString(upiStr) {
				// Don't mark invalid, just warn via error but still keep row valid?
				errs = append(errs, ParseError{Row: i, Reason: "loosely invalid UPI shape: " + upiStr})
			}
			parsed["counterparty_upi"] = upiStr
		}
		if narrIdx, ok := colIndices["narration"]; ok && narrIdx < len(rawRow) {
			parsed["narration"] = strings.TrimSpace(rawRow[narrIdx])
		}

		if valid {
			rows = append(rows, parsed)
		}
	}

	return rows, errs
}
