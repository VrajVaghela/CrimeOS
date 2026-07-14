
package analytics

import (
	"bytes"
	"mime/multipart"
	"testing"

	"github.com/stretchr/testify/assert"
)

// testFile wraps a bytes.Reader and adds a no-op Close method.
type testFile struct {
	*bytes.Reader
}

func (t testFile) Close() error { return nil }

func TestSaveUpload(t *testing.T) {
	tempDir := t.TempDir()
	cfg := NewStorageConfig(tempDir, 1000) // 1000 bytes max

	t.Run("valid csv upload succeeds", func(t *testing.T) {
		testContent := []byte("a,b,c\n1,2,3")
		file := testFile{bytes.NewReader(testContent)}
		header := &multipart.FileHeader{
			Filename: "test.csv",
			Size:     int64(len(testContent)),
		}

		path, hash, err := SaveUpload(file, header, cfg)
		assert.NoError(t, err)
		assert.NotEmpty(t, path)
		assert.NotEmpty(t, hash)
		assert.FileExists(t, path)
	})

	t.Run("unsupported file type rejected", func(t *testing.T) {
		testContent := []byte("test")
		file := testFile{bytes.NewReader(testContent)}
		header := &multipart.FileHeader{
			Filename: "test.exe",
			Size:     int64(len(testContent)),
		}

		_, _, err := SaveUpload(file, header, cfg)
		assert.Equal(t, ErrUnsupportedFileType, err)
	})

	t.Run("oversized file rejected", func(t *testing.T) {
		largeContent := make([]byte, 2000) // 2000 bytes > 1000 limit
		file := testFile{bytes.NewReader(largeContent)}
		header := &multipart.FileHeader{
			Filename: "large.csv",
			Size:     int64(len(largeContent)),
		}

		_, _, err := SaveUpload(file, header, cfg)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "file too large")
	})

	t.Run("zero byte file accepted", func(t *testing.T) {
		testContent := []byte("")
		file := testFile{bytes.NewReader(testContent)}
		header := &multipart.FileHeader{
			Filename: "empty.csv",
			Size:     int64(len(testContent)),
		}

		path, _, err := SaveUpload(file, header, cfg)
		assert.NoError(t, err)
		assert.FileExists(t, path)
	})
}

