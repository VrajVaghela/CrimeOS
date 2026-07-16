package osint

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClassifyBreachSeverity(t *testing.T) {
	cases := []struct {
		name        string
		dataClasses []string
		expected    string
	}{
		{"no data classes", nil, "LOW"},
		{"passwords only", []string{"Passwords"}, "HIGH"},
		{"financial credentials only", []string{"Financial Credentials"}, "LOW"},
		{"mixed sensitive classes", []string{"Passwords", "Email Addresses"}, "HIGH"},
		{"medium risk classes", []string{"Phone Numbers", "Email Addresses"}, "MEDIUM"},
		{"low risk classes", []string{"Names", "Locations"}, "LOW"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, ClassifySeverity(tc.dataClasses))
		})
	}
}
