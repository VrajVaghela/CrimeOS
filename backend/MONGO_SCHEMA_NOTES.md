
# MongoDB Schema Notes

## `raw_response_dumps`

Stores metadata about raw provider response files, which are stored on the local filesystem (object storage for hackathon scope).

### Relationship to PostgreSQL
- `legal_request_id`: Foreign key to `legal_requests.id` (PostgreSQL)
- `case_id`: Foreign key to `cases.id` (assumed shared core table in PostgreSQL)

### Fields
- `_id`: MongoDB ObjectId
- `legal_request_id`: String UUID of the associated legal request
- `case_id`: String UUID of the case
- `file_meta`: Contains original filename, MIME type, size, storage path, SHA256 checksum
- `parse_status`: `PENDING` | `PARSING` | `PARSED` | `FAILED`
- `parser_used`: Name of the parser strategy used (e.g. `cdr_parser_v1`)
- `row_count_detected`: Total rows detected in dump
- `row_count_parsed`: Rows successfully normalized into relational tables
- `parse_errors`: Array of row-level errors, each with:
  - `row`: Row number where error occurred (0 for file-level errors)
  - `reason`: String explanation of error
  - `raw`: Optional raw row text
- `uploaded_by`: Officer ID
- `uploaded_at`/`parsed_at`: Timestamps

