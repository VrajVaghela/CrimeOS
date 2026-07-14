# Stage 3 · Checkpoint 1 — Response Upload Ingestion & MongoDB Mirror

## Objective
Build the multipart file-upload endpoint that accepts a provider's response dump (CSV/XLSX/PDF), stores the raw bytes to object storage (local filesystem for hackathon scope), and mirrors metadata into MongoDB `raw_response_dumps` with `parse_status = PENDING`.

## Context
- Endpoint: `POST /api/v1/legal-requests/{id}/responses`, `GET /api/v1/legal-requests/{id}/responses/{dumpId}` — `ARCHITECTURE.md` §1.5.
- Mongo schema: `ARCHITECTURE.md` §1.4.
- Depends on Stage 2 Checkpoint 2/3 (`legal_requests` must exist and ideally be `SENT`/`ACKNOWLEDGED` — validate this precondition).

## Step-by-Step Instructions
1. Create `internal/analytics/storage.go`:
   - `func SaveUpload(file multipart.File, header *multipart.FileHeader, destDir string) (path string, sha256sum string, err error)` — validates extension against whitelist `.csv`, `.xlsx`, `.pdf` (reject others with a typed `ErrUnsupportedFileType`), validates size against a `MAX_UPLOAD_BYTES` env-configured limit (default 25MB), streams to disk under `destDir/{year}/{month}/{uuid}.{ext}` while computing a SHA-256 checksum in the same pass (use `io.MultiWriter` with a file writer and a `sha256.New()` hasher).
2. Create `internal/analytics/mongo_repository.go`:
   - `func (r *MongoRepository) InsertDump(ctx context.Context, doc RawResponseDump) (string, error)` — inserts into `raw_response_dumps`, returns the Mongo `_id` as string.
   - `func (r *MongoRepository) GetDump(ctx context.Context, id string) (RawResponseDump, error)`.
   - `func (r *MongoRepository) UpdateParseStatus(ctx context.Context, id string, status string, rowsDetected, rowsParsed int, parseErrors []ParseError) error`.
   - Define the `RawResponseDump` and `ParseError` structs mirroring the schema in `ARCHITECTURE.md` §1.4 exactly (field names as `bson` tags).
3. Create `internal/handler/response_upload.go`:
   - `UploadResponse(legalReqRepo *lers.Repository, storage StorageConfig, mongoRepo *analytics.MongoRepository) http.HandlerFunc`:
     a. Validate the `legal_request_id` exists; return `404` if not.
     b. Parse multipart form (`r.ParseMultipartForm(maxMemory)`), extract the file.
     c. Call `SaveUpload`; on `ErrUnsupportedFileType` return `400`; on size-limit exceeded return `413`.
     d. Insert the Mongo mirror doc with `parse_status: PENDING`.
     e. Enqueue a parse job (reuse the `dispatch.Queue` pattern from Stage 2, or create a small dedicated `analytics.ParseQueue` — prefer a dedicated queue to keep domains decoupled per the folder-boundary rule in `TRAE_SYSTEM_INSTRUCTIONS.md` §1).
     f. Return `202 {"dump_id": "...", "parse_status": "PENDING"}`.
   - `GetResponseDump` — `200` with current parse status/error detail, `404` if not found.
4. Wire routes; ensure the upload route is registered with a larger body-size limit middleware than default handlers (explicit `http.MaxBytesReader` wrapping).
5. Write `internal/analytics/storage_test.go` covering: valid CSV upload succeeds with correct checksum, oversized file rejected, disallowed extension (`.exe`) rejected, and a corrupted/zero-byte file still gets an entry (parse will fail downstream in Checkpoint 2, not here — this checkpoint only validates the upload/store contract, not content).

## Verification Checkpoint
```bash
cd backend && go test ./internal/analytics/... -v

echo "a,b,c" > /tmp/sample.csv
curl -s -X POST http://localhost:8080/api/v1/legal-requests/<id>/responses \
  -F "file=@/tmp/sample.csv" | jq
# expect 202 with dump_id

curl -s http://localhost:8080/api/v1/legal-requests/<id>/responses/<dumpId> | jq
# expect parse_status PENDING (or PARSING/FAILED once queue worker from Checkpoint 2 picks it up)

# reject test
dd if=/dev/zero of=/tmp/huge.csv bs=1M count=30
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/v1/legal-requests/<id>/responses -F "file=@/tmp/huge.csv"
# expect 413
```

## Documentation Requirements
- `internal/analytics/doc.go`: describes the upload → mirror → queue → parse pipeline end to end (even though parsing itself is built in the next checkpoint, document the full intended flow now so later checkpoints don't drift from it).
- `backend/API.md`: append the two endpoints.
- Note in `SCHEMA_NOTES.md`-equivalent for Mongo (create `backend/MONGO_SCHEMA_NOTES.md` if it doesn't exist) documenting the `raw_response_dumps` collection purpose and its relationship to `legal_requests.id`.
