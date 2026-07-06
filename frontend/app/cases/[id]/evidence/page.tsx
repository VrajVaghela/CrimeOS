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
    if (caseId) {
      void loadEvidence();
    }
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
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
            className="gap-1.5 glow-primary hover:scale-105 transition-all duration-200"
            id="upload-evidence-btn"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Image...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Image Evidence
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading evidence list...</p>
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border p-16 text-center grid-bg">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Camera className="h-8 w-8 text-primary glow-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">No Evidence Uploaded</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload photographs, CCTV screenshots, or transaction receipt images to invoke Gemini Vision auto-tagging.
            </p>
          </div>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Select File
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evidenceList.map((ev) => {
            const highConfidence = ev.ai_tags.confidence >= 0.85;
            return (
              <Card key={ev.id} className="glass border-border/80 overflow-hidden relative group transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
                {/* Image panel */}
                <div className="h-56 w-full relative bg-black/40 border-b border-border/40 overflow-hidden flex items-center justify-center">
                  <img
                    src={`${API_URL}/${ev.file_path}`}
                    alt={ev.ai_tags.description || "Evidence material"}
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Badge
                      className={[
                        "text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full px-2 py-0.5",
                        highConfidence
                          ? "bg-success/15 text-success border border-success/30"
                          : "bg-accent/15 text-accent border border-accent/30",
                      ].join(" ")}
                      variant="outline"
                    >
                      {Math.round(ev.ai_tags.confidence * 100)}% Conf
                    </Badge>
                  </div>
                </div>

                {/* AI Tags / Analysis Details */}
                <CardHeader className="pb-3 border-l-2 border-primary">
                  <CardTitle className="font-heading text-sm font-bold flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    AI Forensic Identification
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground mt-1 leading-relaxed">
                    {ev.ai_tags.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Tag List */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Tag className="h-3 w-3 text-muted-foreground mr-1" />
                    {ev.ai_tags.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] uppercase font-mono tracking-wide px-2 py-0.5">
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
                        {ev.ai_tags.flagged_features.map((feat, idx) => (
                          <li key={idx}>{feat}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono pt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Uploaded At:{" "}
                    {new Date(ev.uploaded_at).toLocaleString("en-IN", {
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
