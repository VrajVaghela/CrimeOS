
package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RunMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	// Create schema_migrations table if it doesn't exist
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	// Get all applied versions
	rows, err := pool.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return fmt.Errorf("query applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return fmt.Errorf("scan migration version: %w", err)
		}
		applied[v] = true
	}

	// Get all SQL files in the migrations directory (we'll use Glob, but let's implement manually? Or use filepath.Glob)
	pattern := filepath.Join(dir, "*.sql")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("glob migration files: %w", err)
	}

	// Sort lexically
	sort.Strings(matches)

	// Apply each migration in order
	for _, path := range matches {
		filename := filepath.Base(path)
		if applied[filename] {
			continue
		}

		// Read the SQL file
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", filename, err)
		}

		// Execute in transaction
		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin transaction for %s: %w", filename, err)
		}
		defer tx.Rollback(ctx)

		_, err = tx.Exec(ctx, string(content))
		if err != nil {
			return fmt.Errorf("execute migration %s: %w", filename, err)
		}

		_, err = tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", filename)
		if err != nil {
			return fmt.Errorf("record migration %s: %w", filename, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit transaction for %s: %w", filename, err)
		}

		log.Printf("applied migration %s", filename)
	}

	return nil
}
