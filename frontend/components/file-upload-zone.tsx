"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Music, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interpolate, useLanguage } from "@/lib/language-context";

const ACCEPT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "audio/wav": [".wav"],
  "audio/webm": [".webm"],
};

const ACCEPT_STRING = Object.keys(ACCEPT_TYPES).join(",");
const MAX_SIZE_MB = 20;

function getFileIcon(file: File) {
  if (file.type.startsWith("audio/")) return Music;
  if (file.type.startsWith("image/")) return ImageIcon;
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadZoneProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onUpload, disabled }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const validate = useCallback(
    (file: File): string | null => {
      const maxBytes = MAX_SIZE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        const overBy = Math.max(1, Math.ceil((file.size - maxBytes) / (1024 * 1024)));
        return interpolate(t("ingestion.file_too_large"), { max: overBy });
      }
      const validTypes = Object.keys(ACCEPT_TYPES);
      // Extension is the fallback check: browsers report the wrong mime type for
      // m4a and for files copied off some scanner utilities.
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const validExts = Object.values(ACCEPT_TYPES).flat();
      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        return t("ingestion.unsupported_type");
      }
      return null;
    },
    [t],
  );

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        setSelected(null);
        return;
      }
      setError(null);
      setSelected(file);
    },
    [validate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setSelected(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const FileIcon = selected ? getFileIcon(selected) : Upload;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("common.upload_complaint_file")}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            !disabled && inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-squircle border border-dashed p-10 text-center transition-colors duration-200",
          dragging
            ? "border-primary bg-primary/[0.06]"
            : selected
              ? "border-success/50 bg-success/[0.04]"
              : "border-border bg-surface-alt/40 hover:border-border/60",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled}
          id="complaint-file-input"
        />

        {selected ? (
          <>
            <FileIcon className="h-7 w-7 text-success" />
            <div>
              <p className="font-heading font-semibold text-foreground">{selected.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatSize(selected.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
              aria-label={t("common.remove_file")}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-muted-foreground" />
            <div>
              <p className="font-heading font-semibold text-foreground">
                {t("ingestion.upload_hint")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("ingestion.upload_hint_sub")}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={disabled}>
              {t("ingestion.browse_files")}
            </Button>
          </>
        )}
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* The submit button names what pressing it does. It previously read
          "Analyzing complaint…", which describes the state after the press. */}
      {selected ? (
        <Button
          type="button"
          id="upload-submit-btn"
          onClick={() => onUpload(selected)}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="h-4 w-4" />
          {t("ingestion.start_analysis")}
        </Button>
      ) : null}
    </div>
  );
}
