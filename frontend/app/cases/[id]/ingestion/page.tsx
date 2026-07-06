"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Languages,
  Sparkles,
} from "lucide-react";

import { EntityReviewField } from "@/components/entity-review-field";
import { FileUploadZone } from "@/components/file-upload-zone";
import { ProcessingCard } from "@/components/processing-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  getCase,
  getComplaint,
  updateEntity,
  uploadComplaint,
} from "@/lib/api";
import type { CaseDetailOut, ComplaintOut } from "@/lib/types";

const LANGUAGE_LABELS: Record<string, string> = {
  gu: "Gujarati (ગુજરાતી)",
  hi: "Hindi (हिंदी)",
  en: "English",
};

const SOURCE_LABELS: Record<string, string> = {
  pdf: "PDF Document",
  image: "Image / Handwritten FIR",
  audio: "Audio Recording",
  text: "Text",
};

export default function IngestionPage() {
  const { id: caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseDetailOut | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStarted, setProcessingStarted] = useState<Date | null>(null);
  const [pendingComplaintId, setPendingComplaintId] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<ComplaintOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCase = useCallback(async () => {
    try {
      const data = await getCase(caseId as string);
      setCaseData(data);
      // If there's already a complaint, load it
      if (data.complaints.length > 0) {
        const latest = data.complaints[data.complaints.length - 1];
        setComplaint(latest);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load case");
    }
  }, [caseId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  // Polling for complaint processing completion
  const startPolling = useCallback(
    (complaintId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const data = await getComplaint(caseId as string, complaintId);
          // If entities have appeared (or translated_text is populated), done
          if (data.translated_text || data.entities.length > 0) {
            clearInterval(pollRef.current!);
            setProcessing(false);
            setPendingComplaintId(null);
            setComplaint(data);
          }
        } catch {
          // ignore transient errors during polling
        }
      }, 2000);
    },
    [caseId]
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setProcessing(true);
      setProcessingStarted(new Date());
      setComplaint(null);
      try {
        const status = await uploadComplaint(caseId as string, file);
        setPendingComplaintId(status.complaint_id);
        startPolling(status.complaint_id);
      } catch (e) {
        setProcessing(false);
        setProcessingStarted(null);
        setError(e instanceof ApiError ? e.message : "Upload failed");
      }
    },
    [caseId, startPolling]
  );

  const handleEntityChange = useCallback(
    async (entityId: string, newValue: string) => {
      if (!complaint) return;
      await updateEntity(caseId as string, complaint.id, entityId, newValue);
      // Optimistically update local state
      setComplaint((prev) =>
        prev
          ? {
              ...prev,
              entities: prev.entities.map((e) =>
                e.id === entityId ? { ...e, value: newValue } : e
              ),
            }
          : prev
      );
    },
    [caseId, complaint]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Step header */}
      <div className="animate-fade-up">
        <h2 className="font-heading text-xl font-bold">
          Complaint Ingestion{" "}
          <span className="text-muted-foreground font-normal text-base">/ शिकायत अपलोड</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the complaint file — PDF, handwritten image, or audio recording in Gujarati, Hindi,
          or English. AI will transcribe, translate, and extract key entities.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" className="animate-fade-up">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {processing && processingStarted ? (
        <ProcessingCard
          label="Analyzing complaint with Gemini AI…"
          startedAt={processingStarted}
        />
      ) : complaint ? null : (
        /* Upload zone — only shown when no complaint yet and not processing */
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Upload Complaint File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadZone onUpload={handleUpload} disabled={processing} />
          </CardContent>
        </Card>
      )}

      {complaint ? (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Success banner */}
          <Alert className="border-success/50 bg-success/10 text-success-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Complaint analyzed</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              AI has transcribed, translated, and extracted entities. Review and correct below.
            </AlertDescription>
          </Alert>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 font-mono text-xs">
              <Globe className="h-3 w-3" />
              {SOURCE_LABELS[complaint.source_type] ?? complaint.source_type}
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Languages className="h-3 w-3" />
              Detected:{" "}
              {LANGUAGE_LABELS[complaint.detected_language ?? ""] ??
                complaint.detected_language ??
                "Unknown"}
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 text-xs border-primary/40 text-primary"
            >
              <Sparkles className="h-3 w-3" />
              AI-generated via Gemini
            </Badge>
          </div>

          {/* Side-by-side: original vs translated */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-l-2 border-l-muted">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Original Text{" "}
                  <span className="text-xs font-mono text-muted-foreground">
                    ({complaint.detected_language?.toUpperCase() ?? "—"})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaint.raw_text ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {complaint.raw_text}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[90, 75, 80, 60, 70].map((w) => (
                      <Skeleton key={w} className="h-3 rounded-full" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-2 border-l-primary/40 glow-primary">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  English Translation
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-1.5 py-0 ml-1" variant="outline">
                    AI-suggested
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaint.translated_text ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {complaint.translated_text}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[85, 70, 90, 55, 75].map((w) => (
                      <Skeleton key={w} className="h-3 rounded-full" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Extracted entities */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold">
                Extracted Entities
              </h3>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs" variant="outline">
                AI-suggested
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                Click any field to edit · Amber = low confidence
              </span>
            </div>

            {complaint.entities.length === 0 ? (
              <div className="rounded-xl border bg-muted p-6 text-sm text-muted-foreground text-center">
                No entities extracted. The AI may still be processing — refresh in a moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {complaint.entities.map((entity) => (
                  <EntityReviewField
                    key={entity.id}
                    entity={entity}
                    onChange={handleEntityChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Re-upload option */}
          <Separator />
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              Upload a different file
            </summary>
            <div className="mt-4">
              <FileUploadZone onUpload={handleUpload} disabled={processing} />
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
