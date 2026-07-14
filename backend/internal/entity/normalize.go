
package entity

import (
	"strings"
	"unicode"
)

// NormalizePhone normalizes a phone number to E.164-ish digit-only string
func NormalizePhone(phone string) string {
	var digits []rune
	for _, r := range phone {
		if unicode.IsDigit(r) {
			digits = append(digits, r)
		}
	}
	return string(digits)
}

// NormalizeEmail normalizes an email address to lowercase
func NormalizeEmail(email string) string {
	return strings.ToLower(email)
}

// NormalizeUPI normalizes a UPI ID to lowercase
func NormalizeUPI(upi string) string {
	return strings.ToLower(upi)
}
