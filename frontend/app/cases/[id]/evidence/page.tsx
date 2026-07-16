"use client";

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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEvidence, uploadEvidence, ApiError } from "@/lib/api";
import type { EvidenceOut } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function EvidencePage() {
  const params = useParams();
  const caseId = params.id as string;

  const [evidenceList, setEvidenceList] = useState<EvidenceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (caseId) void loadEvidence();
  }, [caseId]);

  async function loadEvidence() {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvidence(caseId);
      setEvidenceList(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load evidence files");
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image evidence (JPG, PNG) is supported for automated AI forensic tagging.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadEvidence(caseId, file);
      setEvidenceList((prev) => [uploaded, ...prev]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Evidence upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Evidence Material Gallery
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload incident images and documents to automatically tag and analyze forensic features via Gemini Vision.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
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
            {uploading ? "Analyzing Image..." : "Upload Image Evidence"}
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
          <p className="text-sm text-muted-foreground">Loading evidence list...</p>
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border/60 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-heading font-semibold text-lg">No Evidence Uploaded</h3>
            <p className="text-sm text-muted-foreground">
              Upload photographs, CCTV screenshots, or transaction receipt images to invoke Gemini Vision auto-tagging.
            </p>
          </div>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4" />
            Select File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evidenceList.map((ev, idx) => {
            const highConfidence = ev.ai_tags.confidence >= 0.85;
            return (
              <Card
                key={ev.id}
                hover
                className="overflow-hidden animate-fade-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Image panel */}
                <div className="h-56 w-full relative bg-black/40 border-b border-border/40 overflow-hidden flex items-center justify-center group">
                  <img
                    src={`${API_URL}/${ev.file_path}`}
                    alt={ev.ai_tags.description || "Evidence material"}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Badge
                      variant={highConfidence ? "success" : "warning"}
                      className="text-[10px] font-mono font-semibold uppercase"
                    >
                      {Math.round(ev.ai_tags.confidence * 100)}% Conf
                    </Badge>
                  </div>
                </div>

                {/* AI Tags */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="font-heading text-sm font-bold flex items-center gap-2 text-violet">
                        <div className="rounded-full bg-violet/15 p-1">
                          <Sparkles className="h-4 w-4 text-violet" />
                        </div>
                        AI Forensic Identification
                      </CardTitle>
                      <CardDescription className="text-xs text-foreground mt-1 leading-relaxed">
                        {ev.ai_tags.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Tag className="h-3 w-3 text-muted-foreground mr-1 shrink-0" />
                    {ev.ai_tags.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] uppercase font-mono">
                        {t}
                      </Badge>
                    ))}
                  </div>

                  {/* Flagged Features */}
                  {ev.ai_tags.flagged_features && ev.ai_tags.flagged_features.length > 0 && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1.5">
                      <span className="font-bold text-[10px] text-destructive flex items-center gap-1 uppercase tracking-wider">
                        <ShieldAlert className="h-3.5 w-3.5" /> Flagged Forensic Features
                      </span>
                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                        {ev.ai_tags.flagged_features.map((feat, i) => (
                          <li key={i}>{feat}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/30">
                    <Calendar className="h-3.5 w-3.5" />
                    Uploaded: {new Date(ev.uploaded_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
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
