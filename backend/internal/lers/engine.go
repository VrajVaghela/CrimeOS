
package lers

import (
	"embed"
	"errors"
	"fmt"
	"text/template"
	"time"
)

//go:embed templates/*.tmpl
var templateFS embed.FS

// ErrUnknownTemplateType is returned when an invalid template type is provided
var ErrUnknownTemplateType = errors.New("unknown template type")

// EntityLine represents a single entity to include in the request
type EntityLine struct {
	EntityType string
	Value      string
}

// RenderInput contains all data needed to render a legal request
type RenderInput struct {
	RequestNumber            string
	CaseNumber               string
	ProviderName             string
	NodalOfficerEmail        string
	IssuingOfficerName       string
	IssuingOfficerDesignation string
	PoliceStation            string
	LegalBasis               string
	RequestedEntities        []EntityLine
	DateIssued               time.Time
	ResponseDeadline         time.Time
}

// Engine is the template rendering engine
type Engine struct {
	templates *template.Template
}

// NewEngine creates a new LERS engine
func NewEngine() (*Engine, error) {
	tmpl, err := template.ParseFS(templateFS, "templates/*.tmpl")
	if err != nil {
		return nil, fmt.Errorf("parse templates: %w", err)
	}
	return &Engine{templates: tmpl}, nil
}

// templateTypeToFilename maps template types to their .tmpl files
var templateTypeToFilename = map[string]string{
	"IP_LOG_REQUEST":          "ip_log_request.tmpl",
	"CDR_REQUEST":             "cdr_request.tmpl",
	"KYC_REQUEST":             "kyc_request.tmpl",
	"ACCOUNT_FREEZE_REQUEST":  "account_freeze_request.tmpl",
	"SUBSCRIBER_DETAILS_REQUEST": "subscriber_details_request.tmpl",
	"BANK_STATEMENT_REQUEST":  "bank_statement_request.tmpl",
}

// Render renders a legal request from the given template type and input
func (e *Engine) Render(templateType string, input RenderInput) (string, error) {
	filename, ok := templateTypeToFilename[templateType]
	if !ok {
		return "", fmt.Errorf("%w: %s", ErrUnknownTemplateType, templateType)
	}

	var buf []byte
	w := &buffer{buf: &buf}
	if err := e.templates.ExecuteTemplate(w, filename, input); err != nil {
		return "", fmt.Errorf("execute template: %w", err)
	}

	return string(buf), nil
}

// buffer is a simple io.Writer that writes to a []byte pointer
type buffer struct {
	buf *[]byte
}

func (b *buffer) Write(p []byte) (n int, err error) {
	*b.buf = append(*b.buf, p...)
	return len(p), nil
}
