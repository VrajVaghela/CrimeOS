package osint

import (
	"regexp"
	"strings"
)

var (
	emailPattern    = regexp.MustCompile(`(?i)[\w.+-]+@[\w-]+\.[\w.-]+`)
	phonePattern    = regexp.MustCompile(`(?m)\+?[0-9][0-9\s\-\.\(\)]{5,20}[0-9]`)
	aliasPattern    = regexp.MustCompile(`(?i)@([A-Za-z0-9._-]{3,})`)
	locationPattern = regexp.MustCompile(`(?i)\b(India|Bangalore|Bengaluru|Mumbai|Delhi|New\s+York|NYC|London|UK|United\s+Kingdom|United\s+States|USA|US|Germany|Berlin|Australia|Sydney|Melbourne|Toronto|Canada)\b`)
	timezonePattern = regexp.MustCompile(`(?i)\b(UTC[+-]\d{1,2}(?::\d{2})?|GMT[+-]\d{1,2}|EST|EDT|PST|PDT|CET|IST)\b`)
)

type discoveredCandidate struct {
	entityType      string
	rawValue        string
	normalizedValue string
	confidence      float64
}

func extractBioFootprints(bio string) []discoveredCandidate {
	if bio == "" {
		return nil
	}

	seen := make(map[string]struct{})
	var results []discoveredCandidate

	for _, email := range emailPattern.FindAllString(bio, -1) {
		normal := strings.ToLower(strings.TrimSpace(email))
		key := "EMAIL|" + normal
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		results = append(results, discoveredCandidate{
			entityType:      "EMAIL",
			rawValue:        email,
			normalizedValue: normal,
			confidence:      0.95,
		})
	}

	for _, raw := range aliasPattern.FindAllStringSubmatch(bio, -1) {
		alias := raw[1]
		normal := normalizeAlias(alias)
		if normal == "" {
			continue
		}
		key := "SOCIAL_HANDLE|" + normal
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		results = append(results, discoveredCandidate{
			entityType:      "SOCIAL_HANDLE",
			rawValue:        alias,
			normalizedValue: normal,
			confidence:      0.8,
		})
	}

	for _, raw := range phonePattern.FindAllString(bio, -1) {
		normal := normalizePhone(raw)
		if normal == "" {
			continue
		}
		key := "PHONE|" + normal
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		results = append(results, discoveredCandidate{
			entityType:      "PHONE",
			rawValue:        raw,
			normalizedValue: normal,
			confidence:      0.85,
		})
	}

	return results
}

func normalizeAlias(alias string) string {
	a := strings.TrimSpace(strings.TrimPrefix(alias, "@"))
	a = strings.ToLower(a)
	if len(a) < 3 {
		return ""
	}
	return a
}

func normalizePhone(raw string) string {
	clean := strings.Builder{}
	for _, r := range raw {
		if r >= '0' && r <= '9' || r == '+' {
			clean.WriteRune(r)
		}
	}
	normalized := clean.String()
	if len(normalized) < 7 {
		return ""
	}
	return normalized
}

func extractLocationHint(bio string) *string {
	match := locationPattern.FindString(bio)
	if match == "" {
		return nil
	}
	hint := strings.TrimSpace(match)
	return &hint
}

func extractTimezoneHint(bio string) *string {
	match := timezonePattern.FindString(bio)
	if match == "" {
		return nil
	}
	hint := strings.ToUpper(strings.TrimSpace(match))
	return &hint
}
