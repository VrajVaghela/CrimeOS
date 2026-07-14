
package lers

import "fmt"

// GenerateRequestNumber formats a request number as LERS/{year}/{seq:06d}
func GenerateRequestNumber(seq int, year int) string {
	return fmt.Sprintf("LERS/%d/%06d", year, seq)
}
