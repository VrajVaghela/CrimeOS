"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Camera,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Tag,
  Upload,
  Video,
  Volume2,
} from "lucide-react";

import { EvidenceReviewWorkspace } from "@/components/evidence-review-workspace";
import { VideoEvidenceWorkspace } from "@/components/video-evidence-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getEvidence, uploadEvidence, uploadVideo } from "@/lib/api";
import { useFormatters } from "@/lib/format";
import { interpolate, useLanguage, type TranslationKey } from "@/lib/language-context";
import type { EvidenceOut } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * File type is a fact, not a status, so every type badge is the same neutral
 * outline and only the icon changes. The previous version gave each type its own
 * hue from Tailwind's stock palette — sky, emerald, purple, indigo, amber — five
 * colours this design system does not contain, on a screen whose own palette
 * carries meaning. That single gallery was the loudest off-system surface here.
 */
const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  audio: Volume2,
  video: Video,
  document: FileText,
};

function typeKey(fileType: string | null): TranslationKey {
  const known = ["image", "audio", "video", "document"];
  const slug = fileType && known.includes(fileType) ? fileType : "media";
  return `evidence.type.${slug}` as TranslationKey;
}

export default function EvidencePage() {
  const { t } = useLanguage();
  const { formatDate } = useFormatters();
  const params = useParams();
  const caseId = params.id as string;

  const [evidenceList, setEvidenceList] = useState<EvidenceOut[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (caseId) void loadEvidence();
  }, [caseId]);

  async function loadEvidence(autoSelectId?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvidence(caseId);
      setEvidenceList(data);
      if (autoSelectId) {
        const item = data.find((e) => e.id === autoSelectId);
        if (item) setSelectedEvidence(item);
      } else if (selectedEvidence) {
        const updated = data.find((e) => e.id === selectedEvidence.id);
        if (updated) setSelectedEvidence(updated);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("evidence.load_error"));
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|mov|avi)$/i.test(file.name);
    const isDoc =
      file.type === "application/pdf" ||
      file.type.startsWith("text/") ||
      /\.(txt|pdf)$/i.test(file.name);

    if (!isImage && !isAudio && !isVideo && !isDoc) {
      setError(t("evidence.unsupported_upload"));
      return;
    }

    setUploading(true);
    setError(null);
    try {
      if (isVideo) {
        const res = await uploadVideo(caseId, file);
        await loadEvidence(res.case_id);
      } else {
        const uploaded = await uploadEvidence(caseId, file);
        setEvidenceList((prev) => [uploaded, ...prev]);
        setSelectedEvidence(uploaded);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("evidence.upload_error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (selectedEvidence) {
    return (
      <div className="flex animate-fade-up flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedEvidence(null)}
          className="-ml-3 self-start gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("evidence.back_to_gallery")}
        </Button>

        {selectedEvidence.file_type === "video" ? (
          <VideoEvidenceWorkspace
            evidence={selectedEvidence}
            onRefresh={() => void loadEvidence()}
          />
        ) : (
          <EvidenceReviewWorkspace
            evidence={selectedEvidence}
            onRefresh={() => void loadEvidence()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <PageHeader
        level="section"
        title={t("evidence.title")}
        description={t("evidence.subtitle")}
        actions={
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,audio/*,video/*,application/pdf,text/plain"
              className="hidden"
              id="evidence-file-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              loading={uploading}
              id="upload-evidence-btn"
            >
              {!uploading && <Upload className="h-4 w-4" />}
              {uploading ? t("evidence.analyzing_file") : t("evidence.upload_file")}
            </Button>
          </>
        }
      />

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-squircle" />
          ))}
        </div>
      ) : evidenceList.length === 0 ? (
        <EmptyState
          icon={Camera}
          title={t("evidence.no_evidence")}
          description={t("evidence.no_evidence_sub")}
          action={{
            label: t("evidence.select_file"),
            onClick: () => fileInputRef.current?.click(),
            icon: Upload,
          }}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evidenceList.map((ev) => {
            const highConfidence = ev.ai_tags.confidence >= 0.85;
            const isImage = ev.file_type === "image";
            const TypeIcon = TYPE_ICON[ev.file_type ?? ""] ?? FileText;
            const tags = ev.ai_tags?.tags ?? [];

            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => setSelectedEvidence(ev)}
                  className="flex h-full w-full flex-col overflow-hidden rounded-squircle border border-border/80 bg-card text-left transition-colors duration-200 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="relative flex h-44 w-full shrink-0 items-center justify-center overflow-hidden border-b border-border/60 bg-surface-alt">
                    {isImage ? (
                      // Alt is the file name, not the AI description: the
                      // description is already rendered as text below, and a
                      // paragraph of alt spills out of the tile whenever the
                      // image fails to load.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${API_URL}/${ev.file_path}`}
                        alt={ev.file_path.split("/").pop() ?? t(typeKey(ev.file_type))}
                        className="max-h-full max-w-full object-contain px-4 text-center text-[10px] text-muted-foreground"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4">
                        <TypeIcon className="h-8 w-8 text-muted-foreground" />
                        <span className="max-w-[200px] truncate font-mono text-[10px] text-muted-foreground">
                          {ev.file_path.split("/").pop()}
                        </span>
                      </div>
                    )}

                    <Badge
                      variant="outline"
                      className="absolute left-3 top-3 gap-1 bg-background/80 font-mono text-[10px] uppercase backdrop-blur-sm"
                    >
                      <TypeIcon className="h-3 w-3" />
                      {t(typeKey(ev.file_type))}
                    </Badge>

                    <Badge
                      variant={highConfidence ? "success" : "warning"}
                      className="absolute right-3 top-3 font-mono text-[10px] font-semibold"
                    >
                      {Math.round(ev.ai_tags.confidence * 100)}% {t("evidence.confidence_short")}
                    </Badge>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-info" />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-info">
                        {t("evidence.ai_insights")}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-secondary-foreground">
                      {ev.ai_tags.description}
                    </p>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <Tag className="mr-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        {tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="font-mono text-[10px] uppercase"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {ev.markers && ev.markers.length > 0 && (
                      <p className="font-mono text-[10px] text-info">
                        {interpolate(t("evidence.markers_pinned"), {
                          count: ev.markers.length,
                        })}
                      </p>
                    )}

                    <div className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-3 font-mono text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {t("evidence.uploaded_label")}: {formatDate(ev.uploaded_at)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
