
package analytics

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ErrUnsupportedFileType is returned when an uploaded file has an invalid extension
var ErrUnsupportedFileType = errors.New("unsupported file type")

var supportedExtensions = map[string]bool{
	".csv":  true,
	".xlsx": true,
	".pdf":  true,
}

const defaultMaxUploadBytes = 25 * 1024 * 1024 // 25 MB

// StorageConfig holds upload configuration
type StorageConfig struct {
	DestDir          string
	MaxUploadBytes   int64
}

// NewStorageConfig creates a new StorageConfig with defaults
func NewStorageConfig(destDir string, maxUploadBytes int64) *StorageConfig {
	if maxUploadBytes <= 0 {
		maxUploadBytes = defaultMaxUploadBytes
	}
	return &StorageConfig{
		DestDir:        destDir,
		MaxUploadBytes: maxUploadBytes,
	}
}

// SaveUpload saves an uploaded file to disk with SHA256 checksum
func SaveUpload(file multipart.File, header *multipart.FileHeader, cfg *StorageConfig) (path string, sha256sum string, err error) {
	defer file.Close()

	// Validate extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !supportedExtensions[ext] {
		return "", "", ErrUnsupportedFileType
	}

	// Validate size
	if header.Size > cfg.MaxUploadBytes {
		return "", "", fmt.Errorf("file size exceeds limit of %d bytes: %w", cfg.MaxUploadBytes, errors.New("file too large"))
	}

	// Create destination directory structure
	now := time.Now()
	yearMonthDir := filepath.Join(cfg.DestDir, fmt.Sprintf("%04d", now.Year()), fmt.Sprintf("%02d", now.Month()))
	if err := os.MkdirAll(yearMonthDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	fullPath := filepath.Join(yearMonthDir, filename)

	// Create file and hash
	destFile, err := os.Create(fullPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer destFile.Close()

	hasher := sha256.New()
	multiWriter := io.MultiWriter(destFile, hasher)
	if _, err := io.Copy(multiWriter, file); err != nil {
		os.Remove(fullPath)
		return "", "", fmt.Errorf("failed to save file: %w", err)
	}

	hash := hex.EncodeToString(hasher.Sum(nil))
	return fullPath, hash, nil
}

