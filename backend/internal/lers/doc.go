
// Package lers (Legal Request System) provides a template engine that renders
// provider-specific legal request documents from case metadata and confirmed entities,
// plus aggregation for dashboard/timeline UI (avoiding N+1 queries).
//
// Adding a New Template Type:
// 1. Add a new .tmpl file in /backend/templates/ with the appropriate name
// 2. Add the template type to the enum validation in engine.go
// 3. Add a new test case to engine_test.go
package lers
