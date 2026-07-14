
package lers

import (
	"strings"
	"testing"
	"time"
)

func TestRenderAllTemplateTypes(t *testing.T) {
	testCases := []struct {
		name         string
		templateType string
	}{
		{name: "IP_LOG_REQUEST", templateType: "IP_LOG_REQUEST"},
		{name: "CDR_REQUEST", templateType: "CDR_REQUEST"},
		{name: "KYC_REQUEST", templateType: "KYC_REQUEST"},
		{name: "ACCOUNT_FREEZE_REQUEST", templateType: "ACCOUNT_FREEZE_REQUEST"},
		{name: "SUBSCRIBER_DETAILS_REQUEST", templateType: "SUBSCRIBER_DETAILS_REQUEST"},
		{name: "BANK_STATEMENT_REQUEST", templateType: "BANK_STATEMENT_REQUEST"},
	}

	engine, err := NewEngine()
	if err != nil {
		t.Fatalf("NewEngine failed: %v", err)
	}

	fixtureInput := RenderInput{
		RequestNumber:             "LERS/2026/000001",
		CaseNumber:                "FIR-123/2026",
		ProviderName:              "Airtel India",
		NodalOfficerEmail:         "nodal.airtel@lea-demo.internal",
		IssuingOfficerName:        "Inspector John Doe",
		IssuingOfficerDesignation: "Investigating Officer",
		PoliceStation:             "Central Police Station",
		LegalBasis:                "Section 91 CrPC",
		RequestedEntities: []EntityLine{
			{EntityType: "IP_ADDRESS", Value: "192.168.1.100"},
			{EntityType: "PHONE", Value: "+919876543210"},
		},
		DateIssued:       time.Date(2026, 7, 13, 0, 0, 0, 0, time.UTC),
		ResponseDeadline: time.Date(2026, 7, 23, 0, 0, 0, 0, time.UTC),
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rendered, err := engine.Render(tc.templateType, fixtureInput)
			if err != nil {
				t.Fatalf("Render failed: %v", err)
			}

			// Assertions
			if !strings.Contains(rendered, fixtureInput.RequestNumber) {
				t.Errorf("Rendered output missing request number: %s", fixtureInput.RequestNumber)
			}
			if !strings.Contains(rendered, fixtureInput.ProviderName) {
				t.Errorf("Rendered output missing provider name: %s", fixtureInput.ProviderName)
			}
			for _, entity := range fixtureInput.RequestedEntities {
				if !strings.Contains(rendered, entity.Value) {
					t.Errorf("Rendered output missing entity value: %s", entity.Value)
				}
			}
		})
	}
}

func TestRenderUnknownTemplateType(t *testing.T) {
	engine, err := NewEngine()
	if err != nil {
		t.Fatalf("NewEngine failed: %v", err)
	}

	_, err = engine.Render("INVALID_TYPE", RenderInput{})
	if err == nil {
		t.Fatalf("Expected error for unknown template type, got nil")
	}
	if !strings.Contains(err.Error(), ErrUnknownTemplateType.Error()) {
		t.Errorf("Expected ErrUnknownTemplateType, got: %v", err)
	}
}

func TestGenerateRequestNumber(t *testing.T) {
	testCases := []struct {
		name     string
		seq      int
		year     int
		expected string
	}{
		{"small sequence", 1, 2026, "LERS/2026/000001"},
		{"medium sequence", 123, 2025, "LERS/2025/000123"},
		{"large sequence", 999999, 2024, "LERS/2024/999999"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := GenerateRequestNumber(tc.seq, tc.year)
			if result != tc.expected {
				t.Errorf("GenerateRequestNumber(%d, %d) = %s, want %s", tc.seq, tc.year, result, tc.expected)
			}
		})
	}
}
