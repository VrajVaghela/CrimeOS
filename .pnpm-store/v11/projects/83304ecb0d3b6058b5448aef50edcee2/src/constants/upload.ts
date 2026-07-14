/** Keep in sync with backend internal/analytics/storage.go defaultMaxUploadBytes (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_UPLOAD_EXTENSIONS = [".csv", ".xlsx", ".pdf"] as const;
