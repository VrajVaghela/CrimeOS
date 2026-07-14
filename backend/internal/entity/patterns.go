
package entity

import (
	"fmt"
	"regexp"
)

// ipv4Pattern matches dotted-quad IPv4 addresses (basic regex; still needs octet validation)
var ipv4Pattern = regexp.MustCompile(`(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)`)

// emailPattern matches RFC-5322-lite email addresses (word chars, ., +, -, @, then domain)
var emailPattern = regexp.MustCompile(`[\w.+-]+@[\w-]+\.[\w.-]+`)

// phonePattern matches Indian mobiles first, then a generic international fallback
var phonePattern = regexp.MustCompile(`(?:\+?91[-.\s]?)?[6-9]\d{9}|\+?[1-9]\d{7,14}`)

// upiPattern matches UPI IDs with known PSP suffixes
var upiPattern = regexp.MustCompile(`[\w.\-]{2,256}@[a-zA-Z]{2,64}`)

// knownUPISuffixes is an allowlist of valid UPI handle suffixes
var knownUPISuffixes = []string{
	"@okhdfcbank", "@okaxis", "@okicici", "@ybl", "@paytm", "@upi",
	"@okciti", "@oksbi", "@okunion", "@jio", "@paytmbank", "@federal",
}

// socialHandlePattern matches @handles and common social media URL paths
var socialHandlePattern = regexp.MustCompile(`(?:@[A-Za-z0-9_.]{2,30}|(?:instagram\.com/|twitter\.com/|x\.com/|facebook\.com/|t\.me/)[A-Za-z0-9_.]{2,30})\b`)

// isValidIPv4Octets validates that each octet in an IPv4 address is ≤255
func isValidIPv4Octets(ip string) bool {
	// Already matched by regex, so just parse each octet
	// Split on '.'
	octets := regexp.MustCompile(`\.`).Split(ip, -1)
	for _, o := range octets {
		// Parse to int, check ≤255
		var val int
		_, err := fmt.Sscanf(o, "%d", &val)
		if err != nil || val < 0 || val > 255 {
			return false
		}
	}
	return true
}
