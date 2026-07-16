# API Endpoints

Base URL path: `/api/v1/video`

---

## 1. Upload Video
**POST** `/analyze`

Uploads a video file, performs security validations, and enqueues the AI analysis task.

**Content-Type**: `multipart/form-data`
**Rate Limit**: 5 requests per minute per IP.

### Request Body
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | The video file (allowed: .mp4, .avi, .mov). Max 500MB. |

### Responses
- **200 OK**
  ```json
  {
    "case_id": "uuid-string",
    "task_id": "celery-task-uuid",
    "status": "UPLOADED"
  }
  ```
- **413 Payload Too Large**: File exceeds maximum size.
- **415 Unsupported Media Type**: Invalid extension or magic bytes.
- **429 Too Many Requests**: Rate limit exceeded.

---

## 2. Poll Status
**GET** `/status/{task_id}`

Checks the progress of a background analysis task.

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Celery task ID returned from `/analyze` |

### Responses
- **200 OK**
  ```json
  {
    "task_id": "celery-task-uuid",
    "case_id": "uuid-string",
    "celery_state": "PROGRESS", // PENDING, PROGRESS, SUCCESS, FAILURE
    "video_case_status": "ANALYZING", 
    "progress_percentage": 45,
    "error_detail": null
  }
  ```
- **404 Not Found**: Task ID does not exist.

---

## 3. Get Report
**GET** `/report/{case_id}`

Retrieves the final incident timeline and metadata, and performs a real-time cryptographic verification of the evidence chain.

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `case_id` | string | Case UUID |

### Responses
- **200 OK**
  ```json
  {
    "case_id": "uuid",
    "filename": "evidence.mp4",
    "original_md5": "hash_string",
    "duration_seconds": 120.5,
    "file_size_bytes": 10485760,
    "status": "COMPLETED",
    "risk_evaluation": "HIGH",
    "summary": "AI generated summary...",
    "created_at": "2026-07-09T00:00:00Z",
    "chain_valid": true,
    "timeline": [
      {
        "timestamp_in_video": "00:15",
        "timestamp_seconds": 15.0,
        "description": "Person entered restricted area.",
        "entities_detected": ["Person", "Door"],
        "risk_level": "MEDIUM",
        "sequence_order": 1
      }
    ]
  }
  ```
- **425 Too Early**: The analysis is still in progress (returns current status).
- **404 Not Found**: Case ID does not exist.

---

## 4. Health Check
**GET** `/health` (Base path, outside `/api/v1/video`)

Verifies the status of the API and its dependent infrastructure (PostgreSQL, Redis).

### Responses
- **200 OK**
  ```json
  {
    "status": "healthy",
    "postgres": true,
    "redis": true
  }
  ```
