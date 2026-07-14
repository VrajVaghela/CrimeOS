import { useState } from "react";
import { uploadResponse, getResponseDump } from "../api/analytics";
import {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_EXTENSIONS,
} from "../constants/upload";

export interface ResponseUploadFormProps {
  legalRequestId: string;
  onUploadComplete?: () => void;
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function ResponseUploadForm({
  legalRequestId,
  onUploadComplete,
}: ResponseUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<
    { row?: number; reason?: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const validateFile = (selected: File): string | null => {
    const ext = selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase();
    if (
      !ALLOWED_UPLOAD_EXTENSIONS.includes(
        ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number]
      )
    ) {
      return `File type not allowed. Accepted: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}`;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      return `File exceeds ${formatBytes(MAX_UPLOAD_BYTES)} limit`;
    }
    return null;
  };

  const pollParseStatus = async (dumpId: string) => {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const dump = await getResponseDump(legalRequestId, dumpId);
      setParseStatus(dump.parse_status);
      if (dump.parse_errors?.length) {
        setParseErrors(dump.parse_errors);
      }
      if (dump.parse_status === "PARSED" || dump.parse_status === "FAILED") {
        if (dump.parse_status === "PARSED") {
          onUploadComplete?.();
        }
        return;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setParseStatus(null);
    setParseErrors([]);

    try {
      const result = await uploadResponse(legalRequestId, file);
      setParseStatus(result.parse_status);
      await pollParseStatus(result.dump_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-4">
      <h3 className="font-semibold">Upload Provider Response</h3>

      <div>
        <input
          type="file"
          accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")}
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setFile(selected);
            setError(null);
            if (selected) {
              const validationError = validateFile(selected);
              if (validationError) setError(validationError);
            }
          }}
          className="block w-full text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Max size: {formatBytes(MAX_UPLOAD_BYTES)}. Accepted:{" "}
          {ALLOWED_UPLOAD_EXTENSIONS.join(", ")}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {parseStatus && (
        <div
          className={`p-3 rounded text-sm ${
            parseStatus === "FAILED"
              ? "bg-red-50 border border-red-200 text-red-700"
              : parseStatus === "PARSED"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}
        >
          Parse status: <strong>{parseStatus}</strong>
          {parseStatus !== "PARSED" && parseStatus !== "FAILED" && (
            <span> — processing…</span>
          )}
        </div>
      )}

      {(parseStatus === "FAILED" || parseErrors.length > 0) && (
        <div>
          <button
            type="button"
            onClick={() => setShowErrors((v) => !v)}
            className="text-sm text-red-600 underline"
          >
            {showErrors ? "Hide" : "Show"} parse errors ({parseErrors.length})
          </button>
          {showErrors && (
            <ul className="mt-2 text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
              {parseErrors.map((err, i) => (
                <li key={i}>
                  Row {err.row ?? "?"}: {err.reason ?? "Unknown error"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!file || uploading || !!error}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload Response"}
      </button>
    </form>
  );
}
