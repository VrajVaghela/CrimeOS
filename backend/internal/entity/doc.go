
// Package entity provides a digital entity extraction pipeline that parses source text
// for IP addresses, emails, phone numbers, UPI IDs, and social handles, with confidence
// scoring and provenance tracking.
//
// Overlap Resolution Priority: IP > Email > UPI > Phone > Social Handle
//
// Confidence Scoring:
// - IP Address: 1.0
// - Email: 1.0
// - UPI ID: 0.85 (suffix must match known PSP list)
// - Phone Number: 0.9
// - Social Handle: 0.7
package entity
