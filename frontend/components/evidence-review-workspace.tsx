import React, { useEffect, useState } from "react";
import {
  FileText,
  Volume2,
  Video,
  Image as ImageIcon,
  Tag,
  Link2,
  FolderPlus,
  CheckCircle,
  Sparkles,
  AlertTriangle,
  Clock,
  ExternalLink,
  PlusCircle,
  Play,
  Bookmark,
} from "lucide-react";
import type { EvidenceOut, EvidenceMarkerOut, CaseEntityOut } from "@/lib/types";
import {
  createEvidenceMarker,
  linkEvidenceMarkerToEntity,
  promoteEvidenceMarker,
  getCaseEntities,
  ApiError,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import { useEnumLabel } from "@/lib/i18n/enums";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface EvidenceReviewWorkspaceProps {
  evidence: EvidenceOut;
  onRefresh: () => void;
}

export function EvidenceReviewWorkspace({ evidence, onRefresh }: EvidenceReviewWorkspaceProps) {
  const { t } = useLanguage();
  const { formatDateTime } = useFormatters();
  const { label } = useEnumLabel();
  const [toastMessage, setToastMessage] = useState<{ title: string; description: string; variant?: string } | null>(null);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    setToastMessage({ title, description, variant });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [entities, setEntities] = useState<CaseEntityOut[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [markers, setMarkers] = useState<EvidenceMarkerOut[]>(evidence.markers || []);

  // Form states for creating a new marker
  const [markerType, setMarkerType] = useState<string>("transcript_segment");
  const [startMs, setStartMs] = useState<string>("");
  const [endMs, setEndMs] = useState<string>("");
  const [transcriptText, setTranscriptText] = useState<string>("");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [creatingMarker, setCreatingMarker] = useState(false);
  const [promotedMarkers, setPromotedMarkers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMarkers(evidence.markers || []);
    if (evidence.case_id) {
      void loadEntities();
    }
  }, [evidence]);

  async function loadEntities() {
    setLoadingEntities(true);
    try {
      const data = await getCaseEntities(evidence.case_id);
      setEntities(data);
    } catch (e) {
      console.error("Failed to load case entities", e);
    } finally {
      setLoadingEntities(false);
    }
  }

  const getFileIcon = (type: string | null) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-5 w-5 text-info" />;
      case "audio":
        return <Volume2 className="h-5 w-5 text-success" />;
      case "video":
        return <Video className="h-5 w-5 text-info" />;
      case "document":
        return <FileText className="h-5 w-5 text-info" />;
      default:
        return <FileText className="h-5 w-5 text-warn" />;
    }
  };

  const handleCreateMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcriptText && markerType === "transcript_segment") {
      toast({
        title: t("evidence_workspace.toast_missing_title"),
        description: t("evidence_workspace.toast_missing_desc"),
        variant: "destructive",
      });
      return;
    }

    setCreatingMarker(true);
    try {
      // 1. Create evidence marker
      const marker = await createEvidenceMarker(evidence.id, {
        marker_type: markerType,
        start_ms: startMs ? parseInt(startMs) : null,
        end_ms: endMs ? parseInt(endMs) : null,
        transcript_text: transcriptText || null,
        linked_entity_ids: [],
      });

      // 2. Link entity if selected
      if (selectedEntityId) {
        await linkEvidenceMarkerToEntity(marker.id, selectedEntityId);
      }

      toast({
        title: t("evidence_workspace.toast_created_title"),
        description: t("evidence_workspace.toast_created_desc"),
      });

      // Reset form
      setTranscriptText("");
      setStartMs("");
      setEndMs("");
      setSelectedEntityId("");

      // Trigger workspace and page updates
      onRefresh();
    } catch (err) {
      toast({
        title: t("evidence_workspace.toast_create_error"),
        description: err instanceof ApiError ? err.message : t("evidence_workspace.toast_create_error_desc"),
        variant: "destructive",
      });
    } finally {
      setCreatingMarker(false);
    }
  };

  const handleLinkMarker = async (markerId: string, entityId: string) => {
    if (!entityId) return;
    try {
      await linkEvidenceMarkerToEntity(markerId, entityId);
      toast({
        title: t("evidence_workspace.toast_linked_title"),
        description: t("evidence_workspace.toast_linked_desc"),
      });
      onRefresh();
    } catch (err) {
      toast({
        title: t("evidence_workspace.toast_link_failed"),
        description: err instanceof ApiError ? err.message : t("evidence_workspace.toast_link_failed_desc"),
        variant: "destructive",
      });
    }
  };

  const handlePromoteMarker = async (markerId: string, textSnippet: string | null) => {
    try {
      const note = textSnippet
        ? `${t("evidence_workspace.fact_verified")}: "${textSnippet}"`
        : t("evidence_workspace.promoted_note");
      await promoteEvidenceMarker(markerId, note);

      setPromotedMarkers((prev) => ({ ...prev, [markerId]: true }));
      toast({
        title: t("evidence_workspace.toast_promoted_title"),
        description: t("evidence_workspace.toast_promoted_desc"),
      });
      onRefresh();
    } catch (err) {
      toast({
        title: t("evidence_workspace.toast_promote_failed"),
        description: err instanceof ApiError ? err.message : t("evidence_workspace.toast_promote_failed_desc"),
        variant: "destructive",
      });
    }
  };

  const highConfidence = evidence.ai_tags?.confidence >= 0.85;

  // Marker types are a fixed frontend vocabulary, so they map straight to the
  // evidence_workspace.marker_* keys rather than going through the enum resolver.
  const markerTypeLabel = (type: string): string => {
    switch (type) {
      case "transcript_segment":
        return t("evidence_workspace.marker_transcript_segment");
      case "audio_timestamp":
        return t("evidence_workspace.marker_audio_timestamp");
      case "video_timestamp":
        return t("evidence_workspace.marker_video_timestamp");
      case "visual_bounding_box":
        return t("evidence_workspace.marker_visual_bbox");
      default:
        return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Evidence Banner */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
<div className="rounded-lg bg-surface-alt border border-border/60 p-2">
            {getFileIcon(evidence.file_type)}
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
              {evidence.file_path.split("/").pop()}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
              <span>
                {t("evidence_workspace.type_label")}: {evidence.file_type?.toUpperCase() || t("common.unknown")}
              </span>
              <span>•</span>
              <span>
                {t("evidence_workspace.uploaded_at")}: {formatDateTime(evidence.uploaded_at)}
              </span>
            </div>
          </div>
        </div>

        <Badge
          variant={highConfidence ? "success" : "warning"}
          className="text-xs font-mono py-1 px-2 uppercase font-semibold"
        >
          {Math.round((evidence.ai_tags?.confidence || 0) * 100)}% {t("evidence_workspace.analysis_conf")}
        </Badge>
      </div>

      {/* Main 2-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media & Forensic Profile */}
        <div className="lg:col-span-5 space-y-6">
<Card className="overflow-hidden border border-border/80 bg-background">
            <CardHeader className="pb-3 border-b border-border/20">
<CardTitle className="text-sm font-bold font-heading text-muted-foreground flex items-center gap-1.5">
                {t("evidence_workspace.original_media")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center justify-center min-h-[220px] bg-black/30">
              {evidence.file_type === "image" && (
                <img
                  src={`${API_URL}/${evidence.file_path}`}
                  alt="Evidence"
                  className="max-w-full max-h-72 object-contain rounded-lg"
                />
              )}

              {evidence.file_type === "audio" && (
                <div className="w-full p-4 space-y-4 text-center">
<div className="mx-auto rounded-full bg-success/10 border border-success/20 p-4 w-14 h-14 flex items-center justify-center">
<Volume2 className="h-6 w-6 text-success animate-pulse" />
                  </div>
                  <audio controls className="w-full" src={`${API_URL}/${evidence.file_path}`} />
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {t("evidence_workspace.audio_loaded")}
                  </p>
                </div>
              )}

              {evidence.file_type === "video" && (
                <div className="w-full">
                  <video controls className="w-full max-h-64 rounded-lg" src={`${API_URL}/${evidence.file_path}`} />
                </div>
              )}

              {evidence.file_type === "document" && (
                <div className="w-full p-6 text-center space-y-3">
<FileText className="h-12 w-12 text-info mx-auto" />
                  <p className="text-sm font-semibold text-foreground">{t("evidence_workspace.document_file")}</p>
                  <a
                    href={`${API_URL}/${evidence.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent-strong hover:underline font-mono"
                  >
                    {t("evidence_workspace.open_new_tab")} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {!evidence.file_type && (
                <div className="text-center p-6 space-y-2">
<AlertTriangle className="h-10 w-10 text-warn mx-auto" />
<p className="text-xs text-warn font-bold uppercase">{t("evidence_workspace.fallback_mode")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("evidence_workspace.fallback_desc")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forensic Tag Profile */}
<Card className="border border-border/80 bg-surface-alt/40">
            <CardHeader className="pb-3 border-b border-border/20">
<CardTitle className="text-sm font-bold font-heading text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet" />
                {t("evidence_workspace.forensic_profile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {t("evidence_workspace.description")}
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {evidence.ai_tags?.description || t("evidence_workspace.no_description")}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {t("evidence_workspace.forensic_tags")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evidence.ai_tags?.tags?.map((tag) => (
<Badge key={tag} variant="secondary" className="text-[10px] uppercase font-mono bg-surface-elevated">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {evidence.ai_tags?.flagged_features && evidence.ai_tags.flagged_features.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] font-bold text-destructive flex items-center gap-1 uppercase">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t("evidence_workspace.flagged_anomalies")}
                  </span>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                    {evidence.ai_tags.flagged_features.map((feat, i) => (
                      <li key={i}>{feat}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Transcript, Translation, Markers */}
        <div className="lg:col-span-7 space-y-6">
          {/* Transcript / Original Document Text Display */}
          {(evidence.transcript || evidence.translation) && (
<Card className="border border-border bg-background/40">
              <CardHeader className="pb-3 border-b border-border/20">
<CardTitle className="text-sm font-bold font-heading text-muted-foreground">
                  {t("evidence_workspace.content_review")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Transcript column */}
                <div className="space-y-2">
<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t("evidence_workspace.original_transcript")}
                  </span>
<div className="p-3 rounded-lg border border-border/40 bg-surface-alt/60 max-h-60 overflow-y-auto text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {evidence.transcript || t("evidence_workspace.no_transcript")}
                  </div>
                </div>

                {/* Translation column */}
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4">
<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t("evidence_workspace.english_translation")}
                  </span>
<div className="p-3 rounded-lg border border-border/40 bg-surface-alt/60 max-h-60 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-secondary-foreground">
                    {evidence.translation || t("evidence_workspace.no_translation")}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Markers / Add segment markers form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Marker form */}
<Card className="border border-border/60 bg-background/30">
              <CardHeader className="pb-2 border-b border-border/20">
<CardTitle className="text-xs font-bold font-heading text-muted-foreground flex items-center gap-1">
                  <PlusCircle className="h-4 w-4 text-primary" /> {t("evidence_workspace.create_marker")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleCreateMarker} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      {t("evidence_workspace.marker_type_label")}
                    </label>
                    <select
                      value={markerType}
                      onChange={(e) => setMarkerType(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 focus:outline-none focus:border-primary"
                    >
                      <option value="transcript_segment">{t("evidence_workspace.marker_transcript_segment")}</option>
                      <option value="audio_timestamp">{t("evidence_workspace.marker_audio_timestamp")}</option>
                      <option value="video_timestamp">{t("evidence_workspace.marker_video_timestamp")}</option>
                      <option value="visual_bounding_box">{t("evidence_workspace.marker_visual_bbox")}</option>
                    </select>
                  </div>

                  {(markerType === "audio_timestamp" || markerType === "video_timestamp") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          {t("evidence_workspace.start_ms")}
                        </label>
                        <input
                          type="number"
                          placeholder="5000"
                          value={startMs}
                          onChange={(e) => setStartMs(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 text-foreground"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          {t("evidence_workspace.end_ms")}
                        </label>
                        <input
                          type="number"
                          placeholder="15000"
                          value={endMs}
                          onChange={(e) => setEndMs(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      {t("evidence_workspace.highlighted_text")}
                    </label>
                    <textarea
                      placeholder={t("evidence_workspace.text_placeholder")}
                      rows={3}
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      {t("evidence_workspace.link_entity_optional")} ({t("common.optional")})
                    </label>
                    <select
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 focus:outline-none focus:border-primary text-foreground"
                    >
                      <option value="">{t("evidence_workspace.do_not_link")}</option>
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {label("entity.type", ent.entity_type)}: {ent.display_value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" disabled={creatingMarker} className="w-full text-xs h-9">
                    {creatingMarker
                      ? t("evidence_workspace.adding_marker")
                      : t("evidence_workspace.pin_segment")}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* List of Markers */}
<Card className="border border-border/60 bg-background/30">
              <CardHeader className="pb-2 border-b border-border/20">
<CardTitle className="text-xs font-bold font-heading text-muted-foreground flex items-center gap-1.5">
<Bookmark className="h-4 w-4 text-success" /> {t("evidence_workspace.fact_markers")} ({markers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 max-h-[350px] overflow-y-auto pr-1">
                <div className="space-y-3">
                  {markers.map((marker) => {
                    const isPromoted = promotedMarkers[marker.id];

                    return (
                      <div
                        key={marker.id}
className="p-3 rounded-lg border border-border bg-surface-alt/60 text-xs space-y-2 animate-fade-up"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-accent-strong uppercase font-bold bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                            {markerTypeLabel(marker.marker_type)}
                          </span>

                          {(marker.start_ms !== null || marker.end_ms !== null) && (
                            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {marker.start_ms !== null ? `${Math.round(marker.start_ms / 1000)}s` : "0s"} -{" "}
                              {marker.end_ms !== null ? `${Math.round(marker.end_ms / 1000)}s` : "end"}
                            </span>
                          )}
                        </div>

                        {marker.transcript_text && (
<blockquote className="border-l-2 border-border pl-2 italic text-secondary-foreground font-mono text-[11px] leading-relaxed break-words">
                            "{marker.transcript_text}"
                          </blockquote>
                        )}

                        {/* Linked Entities */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                            {t("evidence_workspace.linked_case_entities")}
                          </span>
                          <div className="flex flex-wrap gap-1 items-center">
                            {marker.linked_entity_ids.length > 0 ? (
                              marker.linked_entity_ids.map((entId) => {
                                const matchedEnt = entities.find((e) => e.id === entId);
                                return (
<Badge key={entId} variant="secondary" className="text-[9px] font-mono bg-surface-elevated border border-border">
<Link2 className="h-2 w-2 mr-1 text-muted-foreground" />
                                    {matchedEnt
                                      ? `${label("entity.type", matchedEnt.entity_type)}: ${matchedEnt.display_value}`
                                      : t("evidence_workspace.entity_id_ref")}
                                  </Badge>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-1.5 w-full">
                                <span className="text-[10px] text-muted-foreground italic">
                                  {t("evidence_workspace.no_entities_linked")}
                                </span>
                                <select
                                  onChange={(e) => handleLinkMarker(marker.id, e.target.value)}
                                  defaultValue=""
className="bg-background border border-border text-[10px] rounded p-0.5 focus:outline-none"
                                >
                                  <option value="" disabled>{t("evidence_workspace.link_short")}</option>
                                  {entities.map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.display_value}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Promote Actions */}
                        <div className="pt-2 border-t border-slate-800/40 flex justify-end">
                          {isPromoted ? (
<span className="text-[10px] text-success font-bold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> {t("evidence_workspace.added_to_diary")}
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePromoteMarker(marker.id, marker.transcript_text)}
                              className="text-[10px] font-bold text-accent-strong hover:text-primary-foreground hover:bg-primary/20 border border-primary/30 rounded px-2 py-0.5 transition-all flex items-center gap-1"
                            >
                              <FolderPlus className="h-3 w-3" /> {t("evidence_workspace.add_to_diary")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {markers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs font-mono">
                      {t("evidence_workspace.no_markers_yet")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {toastMessage && (
<div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl border glass shadow-2xl animate-fade-up flex flex-col gap-1 max-w-sm ${toastMessage.variant === 'destructive' ? 'border-destructive bg-destructive/10' : 'border-success/20 bg-background/90'}`}>
          <div className="flex items-center gap-2 font-heading font-bold text-sm text-foreground">
{toastMessage.variant === 'destructive' ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
            {toastMessage.title}
          </div>
          <div className="text-xs text-muted-foreground">{toastMessage.description}</div>
        </div>
      )}
    </div>
  );
}
