
// Package db owns the connection lifecycle for both PostgreSQL and MongoDB,
// as well as running database migrations at startup.
// No query logic belongs here—only connection pooling, configuration,
// health checks, and migration management.
package db

