"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Music, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

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

  const validate = useCallback((file: File): string | null => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
    }
    const validTypes = Object.keys(ACCEPT_TYPES);
    // Also check extension for cases where mime type is wrong
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const validExts = Object.values(ACCEPT_TYPES).flat();
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      return "Unsupported file type. Use PDF, JPG/PNG (image), or MP3/WAV/M4A (audio).";
    }
    return null;
  }, []);

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
        aria-label="Upload complaint file"
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
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer",
          dragging
            ? "border-primary bg-primary/10 glow-primary"
            : selected
            ? "border-success bg-success/5"
            : "border-border bg-muted/50 hover:border-primary/50 hover:bg-primary/5",
          disabled ? "opacity-50 cursor-not-allowed" : "",
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
            <FileIcon className="h-10 w-10 text-success" />
            <div>
              <p className="font-semibold text-success font-heading">{selected.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{formatSize(selected.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute top-3 right-3 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold font-heading text-foreground">
                {t("ingestion.upload_hint")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("ingestion.upload_hint_sub")}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" disabled={disabled}>
              {t("common.save") /* Or a browse files string, wait, let's use common.submit or upload_btn */}
              {t("ingestion.upload_btn")}
            </Button>
          </>
        )}
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">{error}</p>
      ) : null}

      {selected ? (
        <Button
          type="button"
          id="upload-submit-btn"
          onClick={() => onUpload(selected)}
          disabled={disabled}
          className="w-full transition-all duration-200 hover:scale-[1.02] hover:glow-primary"
        >
          <Upload className="h-4 w-4" />
          {t("ingestion.analyzing")}
        </Button>
      ) : null}
    </div>
  );
}
