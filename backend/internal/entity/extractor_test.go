
package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExtract(t *testing.T) {
	t.Run("extract all types", func(t *testing.T) {
		source := `Suspect contacted victim from 192.168.10.55 using email scammer123@gmail.com,
phone +91-9876543210, and demanded payment to fraud@okhdfcbank. Also active
on instagram.com/fake_investor_2026.`
		extracted := Extract(source)

		assert.Len(t, extracted, 5)

		// Check IP Address
		ipFound := false
		for _, e := range extracted {
			if e.EntityType == "IP_ADDRESS" {
				ipFound = true
				assert.Equal(t, "192.168.10.55", e.RawValue)
				assert.Equal(t, "192.168.10.55", e.NormalizedValue)
				assert.Equal(t, 1.0, e.Confidence)
			}
		}
		assert.True(t, ipFound)

		// Check Email
		emailFound := false
		for _, e := range extracted {
			if e.EntityType == "EMAIL" {
				emailFound = true
				assert.Equal(t, "scammer123@gmail.com", e.RawValue)
				assert.Equal(t, "scammer123@gmail.com", e.NormalizedValue)
				assert.Equal(t, 1.0, e.Confidence)
			}
		}
		assert.True(t, emailFound)

		// Check Phone
		phoneFound := false
		for _, e := range extracted {
			if e.EntityType == "PHONE" {
				phoneFound = true
				assert.Equal(t, "+91-9876543210", e.RawValue)
				assert.Equal(t, "919876543210", e.NormalizedValue)
				assert.InDelta(t, 0.9, e.Confidence, 0.01)
			}
		}
		assert.True(t, phoneFound)

		// Check UPI
		upiFound := false
		for _, e := range extracted {
			if e.EntityType == "UPI_ID" {
				upiFound = true
				assert.Equal(t, "fraud@okhdfcbank", e.RawValue)
				assert.Equal(t, "fraud@okhdfcbank", e.NormalizedValue)
				assert.InDelta(t, 0.85, e.Confidence, 0.01)
			}
		}
		assert.True(t, upiFound)

		// Check Social Handle
		socialFound := false
		for _, e := range extracted {
			if e.EntityType == "SOCIAL_HANDLE" {
				socialFound = true
				assert.Equal(t, "instagram.com/fake_investor_2026", e.RawValue)
				assert.Equal(t, "instagram.com/fake_investor_2026", e.NormalizedValue)
				assert.InDelta(t, 0.7, e.Confidence, 0.01)
			}
		}
		assert.True(t, socialFound)
	})

	t.Run("overlap priority: UPI not email or social", func(t *testing.T) {
		source := `fraud@okhdfcbank`
		extracted := Extract(source)

		assert.Len(t, extracted, 1)
		assert.Equal(t, "UPI_ID", extracted[0].EntityType)
	})

	t.Run("invalid IP octets rejected", func(t *testing.T) {
		source := `999.999.999.999`
		extracted := Extract(source)

		assert.Len(t, extracted, 0)
	})
}
