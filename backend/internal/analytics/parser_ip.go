
package analytics

import (
	"encoding/csv"
	"io"
	"net"
	"strings"
	"time"
)

// IPLoParser parses IP log CSV files
type IPLoParser struct{} // Wait, no, IPLogParser as per spec!
type IPLogParser struct{}

var ipColumnAliases = map[string][]string{
	"ip_address":        {"ip_address", "ip", "source_ip", "client_ip"},
	"account_identifier": {"account_identifier", "account_id", "user_id", "subscriber_id"},
	"session_start":     {"session_start", "start_time", "start", "datetime"},
	"session_end":       {"session_end", "end_time", "end"},
	"port_number":       {"port_number", "port", "src_port", "client_port"},
}

// Parse parses an IP log file
func (p *IPLogParser) Parse(r io.Reader) ([]ParsedRow, []ParseError) {
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
	for canonical, aliases := range ipColumnAliases {
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

		// IP address (validate)
		if ipIdx, ok := colIndices["ip_address"]; ok && ipIdx < len(rawRow) {
			ipStr := strings.TrimSpace(rawRow[ipIdx])
			if net.ParseIP(ipStr) == nil {
				errs = append(errs, ParseError{Row: i, Reason: "invalid IP address: " + ipStr})
				valid = false
			} else {
				parsed["ip_address"] = ipStr
			}
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing ip_address column"})
			valid = false
		}

		// Account identifier
		if accountIdx, ok := colIndices["account_identifier"]; ok && accountIdx < len(rawRow) {
			parsed["account_identifier"] = strings.TrimSpace(rawRow[accountIdx])
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing account_identifier column"})
			valid = false
		}

		// Optional fields
		if startIdx, ok := colIndices["session_start"]; ok && startIdx < len(rawRow) {
			startStr := strings.TrimSpace(rawRow[startIdx])
			for _, format := range []string{"2006-01-02 15:04:05", "02-01-2006 15:04", time.RFC3339} {
				t, err := time.Parse(format, startStr)
				if err == nil {
					parsed["session_start"] = t
					break
				}
			}
		}
		if endIdx, ok := colIndices["session_end"]; ok && endIdx < len(rawRow) {
			endStr := strings.TrimSpace(rawRow[endIdx])
			for _, format := range []string{"2006-01-02 15:04:05", "02-01-2006 15:04", time.RFC3339} {
				t, err := time.Parse(format, endStr)
				if err == nil {
					parsed["session_end"] = t
					break
				}
			}
		}
		if portIdx, ok := colIndices["port_number"]; ok && portIdx < len(rawRow) {
			parsed["port_number"] = strings.TrimSpace(rawRow[portIdx])
		}

		if valid {
			rows = append(rows, parsed)
		}
	}

	return rows, errs
}
