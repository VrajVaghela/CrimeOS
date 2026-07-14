
// Package analytics handles upload, storage, parsing, and intelligence flagging of
// legal request response dumps (CSV/XLSX/PDF).
// Pipeline:
//  1. Upload: Validate file, save to local disk, mirror metadata to MongoDB (raw_response_dumps)
//  2. Queue: Add parse job to in-memory queue
//  3. Parse: Use Parser strategy interface to parse CSV (CDR/IP/Bank statement)
//  4. Normalize: Insert parsed rows into appropriate PostgreSQL tables (cdr_records/ip_session_records/bank_transaction_records)
//  5. Flag: Apply intelligence heuristics (VPN/Proxy IP, repeated counterparty, tower clustering, high-value txn)
//  6. Log: Publish intel events to caselog (to be implemented later)
//
// Adding a new parser:
//  1. Implement the Parser interface with a Parse(r io.Reader) method returning ([]ParsedRow, []ParseError)
//  2. Register it in SelectParser with the appropriate template type
//  3. Add a test case using a fixture CSV
//  4. Add a batch insert function to Repository and call it from processParseJob
//  5. Add a corresponding heuristic if needed
//
// Heuristics:
// - VPN/Proxy IP: Flags IPs in known VPN/proxy ranges (demo set)
// - Repeated Counterparty: Flags counterparty (UPI/Account) appearing 3+ times
// - Tower Clustering: Flags single tower accounting for 60%+ of CDR calls
// - High-Value Transaction: Flags transactions over configurable threshold (default ₹200000)
package analytics

