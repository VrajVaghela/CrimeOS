package osint

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMockSherlockScannerScanUsernameDeterministic(t *testing.T) {
	ctx := context.Background()
	scanner := &MockSherlockScanner{}

	first, err := scanner.ScanUsername(ctx, "exampleuser")
	assert.NoError(t, err)
	second, err := scanner.ScanUsername(ctx, "exampleuser")
	assert.NoError(t, err)

	assert.Equal(t, first, second)
	assert.NotEmpty(t, first)
	assert.Equal(t, "exampleuser", first[0].Username)
}

func TestMockSherlockScannerScanUsernameCanceledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := (&MockSherlockScanner{}).ScanUsername(ctx, "exampleuser")
	assert.ErrorIs(t, err, context.Canceled)
}
