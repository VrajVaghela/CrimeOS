
# Schema Notes

Populated by internal/entity — see internal/entity/doc.go

## digital_entities
Stores digital entities (IP, email, phone, UPI, etc.) extracted from complaint text for a case, with provenance and human review status. Includes foreign keys to the core case and complaint tables. Unique index on (case_id, entity_type, normalized_value) prevents duplicates per case.

## service_providers
Master data table of telecom/bank/social platform providers, with nodal officer contact info and SLA details for legal requests.

NOTE: 0012_seed_service_providers.sql provides DEMO-ONLY data using fictional @lea-demo.internal email addresses — replace with real nodal-officer registries before any production use.

## legal_requests
Stores legal requests (e.g., CDR, IP log, KYC) created for a case, linked to service providers and confirmed digital entities. Tracks request lifecycle status, rendered document path, and SLA deadlines. Unique request number for tracking.

## dispatch_events
Append-only log of events for a legal request's dispatch lifecycle (queued, sent, failed, etc.), with JSON details.

## cdr_records
Normalized Call Detail Records parsed from uploaded responses, linked back to the corresponding legal request and raw response row.

## ip_session_records
Normalized IP session records parsed from uploaded responses, using INET type for IP addresses for proper indexing and querying.

## bank_transaction_records
Normalized bank transaction records with credit/debit type, counterparty info, and timestamps.

## intelligence_flags
Derived actionable intelligence signals (e.g., VPN IP, repeated counterparty) with severity and linked entities.

## audit_log
Append-only immutable audit log (no UPDATE/DELETE allowed for app role) tracking all mutating actions with before/after state, actor, and IP.
