"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Languages,
  Sparkles,
  Upload,
  FileText,
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
import { useLanguage } from "@/lib/language-context";
import { endonymFor } from "@/lib/i18n/endonyms";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import type { CaseDetailOut, ComplaintOut } from "@/lib/types";



const SOURCE_LABELS: Record<string, string> = {
  pdf: "PDF Document",
  image: "Image / Handwritten FIR",
  audio: "Audio Recording",
  text: "Text",
};

export default function IngestionPage() {
  const { id: caseId } = useParams();
  const { t } = useLanguage();
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

  const startPolling = useCallback(
    (complaintId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const data = await getComplaint(caseId as string, complaintId);
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
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Step header */}
      <div>
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-info to-violet p-1.5">
            <FileText className="h-5 w-5 text-white" />
          </div>
          {t("ingestion.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          {t("ingestion.subtitle")}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" className="animate-fade-down">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {processing && processingStarted ? (
        <ProcessingCard label={t("ingestion.analyzing")} startedAt={processingStarted} />
      ) : complaint ? null : (
        <Card hover className="animate-fade-up delay-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-info via-violet to-primary" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-gradient-to-br from-info/20 to-violet/20 p-1.5">
                <Upload className="h-4 w-4 text-info" />
              </div>
              {t("ingestion.upload_btn")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadZone onUpload={handleUpload} disabled={processing} />
          </CardContent>
        </Card>
      )}

      {complaint && (
        <div className="flex flex-col gap-6">
          {/* Success banner */}
          <Alert variant="success" className="animate-fade-down">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle className="text-success">{t("ingestion.success_title")}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {t("ingestion.success_desc")}
            </AlertDescription>
          </Alert>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2 animate-fade-up delay-100">
            <Badge variant="outline" className="gap-1.5 font-mono text-xs">
              <Globe className="h-3 w-3" />
              {SOURCE_LABELS[complaint.source_type] ?? complaint.source_type}
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Languages className="h-3 w-3" />
              {t("ingestion.detected_language")}:{" "}
              {endonymFor(complaint.detected_language) ?? t("common.unknown")}
            </Badge>
            <Badge variant="info" className="gap-1.5 text-xs">
              <Sparkles className="h-3 w-3" />
              {t("ingestion.ai_generated_via")}
            </Badge>
          </div>

          {/* Side-by-side: original vs translated */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-up delay-200">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  {t("ingestion.original_text")}
                  <span className="text-xs font-mono text-muted-foreground ml-1">
                    ({complaint.detected_language?.toUpperCase() ?? "—"})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaint.raw_text ? (
                  <TranslatedTextBlock content={complaint.raw_text} autoTranslate={false} />
                ) : (
                  <div className="flex flex-col gap-2">
                    {[90, 75, 80, 60, 70].map((w, i) => (
                      <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card accent="primary" className="border-info/40">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-info">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("ingestion.english_translation")}
                  <Badge variant="info" className="text-[10px] px-1.5 py-0 ml-1">
                    {t("ingestion.ai_suggested")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaint.translated_text ? (
                  <TranslatedTextBlock content={complaint.translated_text} />
                ) : (
                  <div className="flex flex-col gap-2">
                    {[85, 70, 90, 55, 75].map((w, i) => (
                      <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator label={t("ingestion.extracted_entities")} />

          {/* Extracted entities */}
          <div className="animate-fade-up delay-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-violet/15 p-1.5">
                <Sparkles className="h-4 w-4 text-violet" />
              </div>
              <h3 className="font-heading font-semibold">{t("ingestion.review_correct")}</h3>
              <Badge variant="info" className="text-xs">
                {t("ingestion.ai_suggested")}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
                {t("ingestion.review_hint")}
              </span>
            </div>

            {complaint.entities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 bg-muted/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("ingestion.no_entities")}
                </p>
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
          <details className="group text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-2">
              <Upload className="h-4 w-4 group-open:rotate-180 transition-transform" />
              {t("ingestion.upload_different")}
            </summary>
            <div className="mt-4 animate-fade-down">
              <FileUploadZone onUpload={handleUpload} disabled={processing} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
