"use client";
import { useLanguage } from "@/lib/language-context";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  Sparkles,
  Tag,
  ShieldAlert,
  Calendar,
  Image as ImageIcon,
  Volume2,
  Video,
  FileText,
  ChevronLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEvidence, uploadEvidence, uploadVideo, ApiError } from "@/lib/api";
import type { EvidenceOut } from "@/lib/types";
import { EvidenceReviewWorkspace } from "@/components/evidence-review-workspace";
import { VideoEvidenceWorkspace } from "@/components/video-evidence-workspace";

export default function EvidencePage() {
  const { t } = useLanguage();
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
      setError(e instanceof ApiError ? e.message : "Failed to load evidence files");
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate allowed mime types: images, audio, video, documents
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".mov") || file.name.endsWith(".avi");
    const isDoc = file.type === "application/pdf" || file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".pdf");

    if (!isImage && !isAudio && !isVideo && !isDoc) {
      setError(
        "Supported file formats for AI forensic analysis are images (PNG/JPG), audio (MP3/WAV), video (MP4/MOV/AVI), and documents (PDF/TXT)."
      );
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
        setSelectedEvidence(uploaded); // Auto-open uploaded file in workspace
      }
      toastSuccess(file.name);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Evidence upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toastSuccess = (name: string) => {
    // Simple custom log/notification representation
    console.log(`Success: uploaded and analyzed ${name}`);
  };

  const getFileTypeBadge = (type: string | null) => {
    switch (type) {
      case "image":
        return <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[10px]">IMAGE</Badge>;
      case "audio":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">AUDIO</Badge>;
      case "video":
        return <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[10px]">VIDEO</Badge>;
      case "document":
        return <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[10px]">DOCUMENT</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px]">MEDIA</Badge>;
    }
  };

  const getFileThumbIcon = (type: string | null) => {
    switch (type) {
      case "audio":
        return <Volume2 className="h-10 w-10 text-emerald-400" />;
      case "video":
        return <Video className="h-10 w-10 text-purple-400" />;
      case "document":
        return <FileText className="h-10 w-10 text-indigo-400" />;
      default:
        return <FileText className="h-10 w-10 text-amber-400" />;
    }
  };

  if (selectedEvidence) {
    return (
      <div className="space-y-4 animate-fade-up">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedEvidence(null)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Evidence Gallery / गैलरी पर वापस जाएं
        </Button>

        {selectedEvidence.file_type === "video" ? (
          <VideoEvidenceWorkspace
            evidence={selectedEvidence}
            onRefresh={() => {
              void loadEvidence();
            }}
          />
        ) : (
          <EvidenceReviewWorkspace
            evidence={selectedEvidence}
            onRefresh={() => {
              void loadEvidence();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {t('command_center.evidence_workspace' as any) || 'Evidence Material Workspace'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('command_center.evidence_desc' as any) || 'Upload images, voice recordings, videos, or documents to automatically extract transcripts, tags, and link facts.'}
          </p>
        </div>

        <div>
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
            {uploading ? "Analyzing File via Gemini..." : "Upload Evidence File / फ़ाइल अपलोड करें"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="animate-fade-down rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading evidence workspace...</p>
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border/60 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-heading font-semibold text-lg">{t('command_center.no_evidence' as any) || 'No Evidence Processed'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('command_center.upload_evidence' as any) || 'Upload photographs, call recordings, cctv snippets, or statement text files to perform forensic verification.'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Select Evidence File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {evidenceList.map((ev, idx) => {
            const highConfidence = ev.ai_tags.confidence >= 0.85;
            const isImage = ev.file_type === "image";

            return (
              <Card
                key={ev.id}
                hover
                className="overflow-hidden cursor-pointer transition-transform duration-150 hover:scale-[1.01] flex flex-col justify-between"
                onClick={() => setSelectedEvidence(ev)}
                style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
              >
                <div>
                  {/* Thumb Preview Panel */}
                  <div className="h-48 w-full relative bg-slate-950/80 border-b border-border/40 overflow-hidden flex items-center justify-center group">
                    {isImage ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/${ev.file_path}`}
                        alt={ev.ai_tags.description || "Evidence material"}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {getFileThumbIcon(ev.file_type)}
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                          {ev.file_path.split("/").pop()}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3">
                      {getFileTypeBadge(ev.file_type)}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Badge
                        variant={highConfidence ? "success" : "warning"}
                        className="text-[9px] font-mono font-semibold uppercase px-1.5"
                      >
                        {Math.round(ev.ai_tags.confidence * 100)}% Conf
                      </Badge>
                    </div>
                  </div>

                  {/* Info Header */}
                  <CardHeader className="pb-3 pt-4">
                    <div className="min-w-0">
                      <CardTitle className="font-heading text-sm font-bold flex items-center gap-2 text-violet">
                        <div className="rounded-full bg-violet/15 p-1 shrink-0">
                          <Sparkles className="h-3.5 w-3.5 text-violet" />
                        </div>
                        <span className="truncate">AI Forensic Insights</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-foreground mt-1.5 line-clamp-3 leading-relaxed">
                        {ev.ai_tags.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </div>

                <CardContent className="space-y-4 pt-0">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 items-center">
                    <Tag className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
                    {(ev.ai_tags?.tags ?? []).slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px] uppercase font-mono">
                        {t}
                      </Badge>
                    ))}
                    {(ev.ai_tags?.tags?.length ?? 0) > 3 && (
                      <span className="text-[9px] font-mono text-muted-foreground">+{(ev.ai_tags.tags.length - 3)}</span>
                    )}
                  </div>

                  {/* Markers count */}
                  {ev.markers && ev.markers.length > 0 && (
                    <div className="text-[10px] font-bold text-sky-400 font-mono">
                      {ev.markers.length} pinned fact markers on this file
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-mono pt-1.5 border-t border-border/30">
                    <Calendar className="h-3 w-3" />
                    Uploaded: {new Date(ev.uploaded_at).toLocaleDateString("en-IN")}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
