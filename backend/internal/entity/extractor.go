
package entity

import (
	"regexp"
	"strings"
)

// Extracted represents a single extracted digital entity with provenance and confidence
type Extracted struct {
	EntityType      string
	RawValue        string
	NormalizedValue string
	Offset          [2]int // Start and end byte offset in source text
	Confidence      float64
}

type extractorPriority int

const (
	priorityIP extractorPriority = iota
	priorityEmail
	priorityUPI
	priorityPhone
	prioritySocial
)

// Extract runs all extractors on the source text and returns non-overlapping matches in priority order
func Extract(sourceText string) []Extracted {
	var candidates []candidateMatch

	// Extract IP Addresses (highest priority)
	for _, m := range findMatchesInternal(sourceText, ipv4Pattern, "IP_ADDRESS", 1.0, priorityIP, func(s string) string { return s }) {
		if isValidIPv4Octets(m.RawValue) {
			candidates = append(candidates, m)
		}
	}

	// Extract Emails
	for _, m := range findMatchesInternal(sourceText, emailPattern, "EMAIL", 1.0, priorityEmail, NormalizeEmail) {
		candidates = append(candidates, m)
	}

	// Extract UPI IDs
	for _, m := range findMatchesInternal(sourceText, upiPattern, "UPI_ID", 0.85, priorityUPI, NormalizeUPI) {
		hasValidSuffix := false
		for _, suffix := range knownUPISuffixes {
			if strings.HasSuffix(strings.ToLower(m.RawValue), suffix) {
				hasValidSuffix = true
				break
			}
		}
		if hasValidSuffix {
			candidates = append(candidates, m)
		}
	}

	// Extract Phone Numbers
	for _, m := range findMatchesInternal(sourceText, phonePattern, "PHONE", 0.9, priorityPhone, NormalizePhone) {
		candidates = append(candidates, m)
	}

	// Extract Social Handles (lowest priority)
	for _, m := range findMatchesInternal(sourceText, socialHandlePattern, "SOCIAL_HANDLE", 0.7, prioritySocial, func(s string) string { return strings.ToLower(s) }) {
		candidates = append(candidates, m)
	}

	return resolveOverlaps(candidates)
}

type candidateMatch struct {
	EntityType      string
	RawValue        string
	NormalizedValue string
	Offset          [2]int
	Confidence      float64
	priority        extractorPriority
}

func findMatchesInternal(sourceText string, re *regexp.Regexp, entityType string, confidence float64, priority extractorPriority, normalize func(string) string) []candidateMatch {
	var matches []candidateMatch
	idxs := re.FindAllStringIndex(sourceText, -1)
	strs := re.FindAllString(sourceText, -1)
	for i, idx := range idxs {
		raw := strs[i]
		normalized := normalize(raw)
		matches = append(matches, candidateMatch{
			EntityType:      entityType,
			RawValue:        raw,
			NormalizedValue: normalized,
			Offset:          [2]int{idx[0], idx[1]},
			Confidence:      confidence,
			priority:        priority,
		})
	}
	return matches
}

func resolveOverlaps(candidates []candidateMatch) []Extracted {
	// Sort candidates by start offset
	for i := range candidates {
		for j := i + 1; j < len(candidates); j++ {
			if candidates[i].Offset[0] > candidates[j].Offset[0] {
				candidates[i], candidates[j] = candidates[j], candidates[i]
			}
		}
	}

	var kept []candidateMatch
	for _, c := range candidates {
		overlaps := false
		for kIdx := range kept {
			k := &kept[kIdx]
			// Check for overlap: [a.start, a.end) overlaps [b.start, b.end) if a.start < b.end and b.start < a.end
			if c.Offset[0] < k.Offset[1] && k.Offset[0] < c.Offset[1] {
				overlaps = true
				if c.priority < k.priority { // c has higher priority, replace k
					*k = c
				}
				// else, keep k, skip c
				break
			}
		}
		if !overlaps {
			kept = append(kept, c)
		}
	}

	result := make([]Extracted, len(kept))
	for i, k := range kept {
		result[i] = Extracted{
			EntityType:      k.EntityType,
			RawValue:        k.RawValue,
			NormalizedValue: k.NormalizedValue,
			Offset:          k.Offset,
			Confidence:      k.Confidence,
		}
	}
	return result
}
