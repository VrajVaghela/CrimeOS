
package analytics

import (
	"errors"
	"io"
)

// ParsedRow is a generic map of column name to value
type ParsedRow map[string]any

// Parser defines the interface for parsing response files
type Parser interface {
	Parse(r io.Reader) (rows []ParsedRow, errs []ParseError)
}

// ErrNoParserForTemplateType is returned when SelectParser can't find a parser for a template type
var ErrNoParserForTemplateType = errors.New("no parser available for template type")

// SelectParser returns the appropriate parser based on template type
func SelectParser(templateType string) (Parser, error) {
	switch templateType {
	case "CDR_REQUEST":
		return &CDRParser{}, nil
	case "IP_LOG_REQUEST", "SUBSCRIBER_DETAILS_REQUEST":
		return &IPLogParser{}, nil
	case "BANK_STATEMENT_REQUEST":
		return &BankStatementParser{}, nil
	default:
		return nil, ErrNoParserForTemplateType
	}
}
