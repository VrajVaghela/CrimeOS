
package model

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds the application configuration.
type Config struct {
	PostgresDSN  string // Required: PostgreSQL connection string
	MongoURI     string // Required: MongoDB connection URI
	MongoDBName  string // Optional: MongoDB database name (default: "crimeos_digitalfootprint")
	Port         string // Optional: HTTP server port (default: "8080")
}

// LoadConfig loads configuration from environment variables.
func LoadConfig() (*Config, error) {
	_ = godotenv.Load() // ignore error, as it might be running in production without a .env file

	cfg := &Config{
		PostgresDSN: os.Getenv("POSTGRES_DSN"),
		MongoURI:    os.Getenv("MONGO_URI"),
		MongoDBName: os.Getenv("MONGO_DB_NAME"),
		Port:        os.Getenv("PORT"),
	}

	if cfg.PostgresDSN == "" {
		return nil, fmt.Errorf("POSTGRES_DSN is required")
	}
	if cfg.MongoURI == "" {
		return nil, fmt.Errorf("MONGO_URI is required")
	}

	if cfg.MongoDBName == "" {
		cfg.MongoDBName = "crimeos_digitalfootprint"
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	return cfg, nil
}

