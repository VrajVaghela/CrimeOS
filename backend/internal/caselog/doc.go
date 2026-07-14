
// Package caselog implements an outbox-pattern event publishing system
// for intelligence events from this module to the broader Crime OS case timeline.
//
// This module writes events to a local caselog_outbox table (not published),
// and the actual cross-module relay to the core case timeline is TODO.
package caselog
