package cases

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Case struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

var ErrCaseNotFound = errors.New("case not found")

func (r *Repository) Create(ctx context.Context) (Case, error) {
	id := uuid.New()
	c := Case{ID: id}
	query := `INSERT INTO cases (id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING created_at, updated_at`
	row := r.pool.QueryRow(ctx, query, id)
	if err := row.Scan(&c.CreatedAt, &c.UpdatedAt); err != nil {
		return Case{}, err
	}
	return c, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (Case, error) {
	c := Case{ID: id}
	query := `SELECT created_at, updated_at FROM cases WHERE id = $1`
	row := r.pool.QueryRow(ctx, query, id)
	if err := row.Scan(&c.CreatedAt, &c.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Case{}, ErrCaseNotFound
		}
		return Case{}, err
	}
	return c, nil
}
