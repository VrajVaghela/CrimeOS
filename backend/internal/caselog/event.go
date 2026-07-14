
package caselog

import (
	"time"

	"github.com/google/uuid"
)

// IntelEvent represents an intelligence event for the case timeline.
type IntelEvent struct {
	CaseID          uuid.UUID
	Source          string
	Summary         string
	Severity        string
	LinkedEntityIDs []uuid.UUID
	OccurredAt      time.Time
}
