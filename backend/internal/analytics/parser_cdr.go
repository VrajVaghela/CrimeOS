
package analytics

import (
	"encoding/csv"
	"io"
	"strconv"
	"strings"
	"time"
)

// CDRParser parses CDR CSV files
type CDRParser struct{}

// Column aliases for CDR (case-insensitive, flexible headers)
var cdrColumnAliases = map[string][]string{
	"caller":           {"caller", "caller_number", "a-party", "calling"},
	"callee":           {"callee", "callee_number", "b-party", "called"},
	"call_type":        {"call_type", "type", "calltype"},
	"call_start":       {"call_start", "start_time", "start", "datetime"},
	"duration_seconds": {"duration_seconds", "duration", "dur_sec", "seconds"},
	"cell_tower_id":    {"cell_tower_id", "tower_id", "cell", "tower"},
	"imei":             {"imei", "device_imei"},
	"imsi":             {"imsi", "sim_imsi"},
}

// Parse parses a CDR file
func (p *CDRParser) Parse(r io.Reader) ([]ParsedRow, []ParseError) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1 // Allow variable fields

	rawRows, err := reader.ReadAll()
	if err != nil {
		return nil, []ParseError{{Row: 0, Reason: "failed to read CSV: " + err.Error()}}
	}

	if len(rawRows) < 1 {
		return nil, []ParseError{{Row: 0, Reason: "empty file"}}
	}

	// Map header column names to indices
	headerIndex := make(map[string]int)
	for i, col := range rawRows[0] {
		lowerCol := strings.ToLower(strings.TrimSpace(col))
		headerIndex[lowerCol] = i
	}

	// Find canonical column indices using aliases
	colIndices := make(map[string]int)
	for canonical, aliases := range cdrColumnAliases {
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

		// Caller
		if callerIdx, ok := colIndices["caller"]; ok && callerIdx < len(rawRow) {
			parsed["caller"] = strings.TrimSpace(rawRow[callerIdx])
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing caller column"})
			valid = false
		}

		// Callee
		if calleeIdx, ok := colIndices["callee"]; ok && calleeIdx < len(rawRow) {
			parsed["callee"] = strings.TrimSpace(rawRow[calleeIdx])
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing callee column"})
			valid = false
		}

		// Call type
		if callTypeIdx, ok := colIndices["call_type"]; ok && callTypeIdx < len(rawRow) {
			parsed["call_type"] = strings.ToUpper(strings.TrimSpace(rawRow[callTypeIdx]))
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing call_type column"})
			valid = false
		}

		// Call start (try multiple formats)
		if callStartIdx, ok := colIndices["call_start"]; ok && callStartIdx < len(rawRow) {
			callStartStr := strings.TrimSpace(rawRow[callStartIdx])
			var callStart time.Time
			found := false
			formats := []string{
				"2006-01-02 15:04:05",
				"02-01-2006 15:04",
				time.RFC3339,
			}
			for _, format := range formats {
				t, err := time.Parse(format, callStartStr)
				if err == nil {
					callStart = t
					found = true
					break
				}
			}
			if found {
				parsed["call_start"] = callStart
			} else {
				errs = append(errs, ParseError{Row: i, Reason: "invalid call_start format: " + callStartStr})
				valid = false
			}
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing call_start column"})
			valid = false
		}

		// Duration seconds
		if durationIdx, ok := colIndices["duration_seconds"]; ok && durationIdx < len(rawRow) {
			durationStr := strings.TrimSpace(rawRow[durationIdx])
			dur, err := strconv.Atoi(durationStr)
			if err == nil {
				parsed["duration_seconds"] = dur
			} else {
				errs = append(errs, ParseError{Row: i, Reason: "invalid duration: " + durationStr})
				valid = false
			}
		} else {
			errs = append(errs, ParseError{Row: i, Reason: "missing duration_seconds column"})
			valid = false
		}

		// Optional fields
		if towerIdx, ok := colIndices["cell_tower_id"]; ok && towerIdx < len(rawRow) {
			parsed["cell_tower_id"] = strings.TrimSpace(rawRow[towerIdx])
		}
		if imeiIdx, ok := colIndices["imei"]; ok && imeiIdx < len(rawRow) {
			parsed["imei"] = strings.TrimSpace(rawRow[imeiIdx])
		}
		if imsiIdx, ok := colIndices["imsi"]; ok && imsiIdx < len(rawRow) {
			parsed["imsi"] = strings.TrimSpace(rawRow[imsiIdx])
		}

		if valid {
			rows = append(rows, parsed)
		}
	}

	return rows, errs
}
