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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
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
  const { toast: toastMessage, show: toast } = useToast();

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
        return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
      case "audio":
        return <Volume2 className="h-5 w-5 text-muted-foreground" />;
      case "video":
        return <Video className="h-5 w-5 text-muted-foreground" />;
      case "document":
        return <FileText className="h-5 w-5 text-muted-foreground" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
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
          <div className="rounded-squircle-sm bg-surface-alt border border-border/60 p-2">
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
          className="text-xs font-mono py-1 px-2 uppercase font-semibold rounded-squircle-sm"
        >
          {Math.round((evidence.ai_tags?.confidence || 0) * 100)}% {t("evidence_workspace.analysis_conf")}
        </Badge>
      </div>

      {/* Main 2-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media & Forensic Profile */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="overflow-hidden border border-border/80 bg-background">
            <CardHeader className="p-4 pb-3 border-b border-border/20">
              <CardTitle className="text-sm font-bold font-heading text-muted-foreground flex items-center gap-1.5">
                {t("evidence_workspace.original_media")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center justify-center min-h-[220px] bg-black/30">
              {evidence.file_type === "image" && (
                <img
                  src={`${API_URL}/${evidence.file_path}`}
                  alt="Evidence"
                  className="max-w-full max-h-72 object-contain rounded-squircle-sm"
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
                  <video controls className="w-full max-h-64 rounded-squircle-sm" src={`${API_URL}/${evidence.file_path}`} />
                </div>
              )}

              {evidence.file_type === "document" && (
                <div className="w-full p-4 text-center space-y-3">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold text-foreground">{t("evidence_workspace.document_file")}</p>
                  <a
                    href={`${API_URL}/${evidence.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent-strong hover:underline font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                  >
                    {t("evidence_workspace.open_new_tab")} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {!evidence.file_type && (
                <div className="text-center p-4 space-y-2">
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
            <CardHeader className="p-4 pb-3 border-b border-border/20">
              <CardTitle className="text-sm font-bold font-heading text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-info" />
                {t("evidence_workspace.forensic_profile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
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
                    <Badge key={tag} variant="secondary" className="text-[10px] uppercase font-mono bg-surface-elevated rounded-squircle-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {evidence.ai_tags?.flagged_features && evidence.ai_tags.flagged_features.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-squircle-sm p-3 space-y-1">
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
              <CardHeader className="p-4 pb-3 border-b border-border/20">
                <CardTitle className="text-sm font-bold font-heading text-muted-foreground">
                  {t("evidence_workspace.content_review")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Transcript column */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t("evidence_workspace.original_transcript")}
                  </span>
                  <div className="p-3 rounded-squircle-sm border border-border/40 bg-surface-alt/60 max-h-60 overflow-y-auto text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {evidence.transcript || t("evidence_workspace.no_transcript")}
                  </div>
                </div>

                {/* Translation column */}
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t("evidence_workspace.english_translation")}
                  </span>
                  <div className="p-3 rounded-squircle-sm border border-border/40 bg-surface-alt/60 max-h-60 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-secondary-foreground">
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
              <CardHeader className="p-4 pb-3 border-b border-border/20">
                <CardTitle className="text-xs font-bold font-heading text-muted-foreground flex items-center gap-1">
                  <PlusCircle className="h-4 w-4 text-primary" /> {t("evidence_workspace.create_marker")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleCreateMarker} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold font-mono text-muted-foreground uppercase">
                      {t("evidence_workspace.marker_type_label")}
                    </Label>
                    <Select
                      value={markerType}
                      onChange={(e) => setMarkerType(e.target.value)}
                      className="h-9 text-xs focus-visible:ring-primary"
                    >
                      <option value="transcript_segment">{t("evidence_workspace.marker_transcript_segment")}</option>
                      <option value="audio_timestamp">{t("evidence_workspace.marker_audio_timestamp")}</option>
                      <option value="video_timestamp">{t("evidence_workspace.marker_video_timestamp")}</option>
                      <option value="visual_bounding_box">{t("evidence_workspace.marker_visual_bbox")}</option>
                    </Select>
                  </div>

                  {(markerType === "audio_timestamp" || markerType === "video_timestamp") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold font-mono text-muted-foreground uppercase">
                          {t("evidence_workspace.start_ms")}
                        </Label>
                        <Input
                          type="number"
                          placeholder="5000"
                          value={startMs}
                          onChange={(e) => setStartMs(e.target.value)}
                          className="h-9 text-xs font-mono focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold font-mono text-muted-foreground uppercase">
                          {t("evidence_workspace.end_ms")}
                        </Label>
                        <Input
                          type="number"
                          placeholder="15000"
                          value={endMs}
                          onChange={(e) => setEndMs(e.target.value)}
                          className="h-9 text-xs font-mono focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold font-mono text-muted-foreground uppercase">
                      {t("evidence_workspace.highlighted_text")}
                    </Label>
                    <Textarea
                      placeholder={t("evidence_workspace.text_placeholder")}
                      rows={3}
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
                      className="min-h-[72px] text-xs resize-none focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold font-mono text-muted-foreground uppercase">
                      {t("evidence_workspace.link_entity_optional")} ({t("common.optional")})
                    </Label>
                    <Select
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
                      className="h-9 text-xs focus-visible:ring-primary"
                    >
                      <option value="">{t("evidence_workspace.do_not_link")}</option>
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {label("entity.type", ent.entity_type)}: {ent.display_value}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Button type="submit" disabled={creatingMarker} className="w-full text-xs h-9 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    {creatingMarker
                      ? t("evidence_workspace.adding_marker")
                      : t("evidence_workspace.pin_segment")}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* List of Markers */}
            <Card className="border border-border/60 bg-background/30">
              <CardHeader className="p-4 pb-3 border-b border-border/20">
                <CardTitle className="text-xs font-bold font-heading text-muted-foreground flex items-center gap-1.5">
                  <Bookmark className="h-4 w-4 text-success" /> {t("evidence_workspace.fact_markers")} ({markers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 max-h-[380px] overflow-y-auto pr-1">
                <div className="space-y-2.5">
                  {markers.map((marker) => {
                    const isPromoted = promotedMarkers[marker.id];

                    return (
                      <div
                        key={marker.id}
                        className="p-3.5 rounded-squircle-sm border border-border/60 bg-surface-alt/50 text-xs space-y-2.5 animate-fade-up"
                      >
                        {/* Line 1: Type badge + timestamp + quote */}
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-mono text-[10px] text-accent-strong uppercase font-bold bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-squircle-sm shrink-0">
                            {markerTypeLabel(marker.marker_type)}
                          </span>

                          {(marker.start_ms !== null || marker.end_ms !== null) && (
                            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3" />
                              {marker.start_ms !== null ? `${Math.round(marker.start_ms / 1000)}s` : "0s"} -{" "}
                              {marker.end_ms !== null ? `${Math.round(marker.end_ms / 1000)}s` : "end"}
                            </span>
                          )}

                          {marker.transcript_text && (
                            <span
                              className="text-xs text-secondary-foreground italic truncate font-mono flex-1 min-w-[120px]"
                              title={marker.transcript_text}
                            >
                              "{marker.transcript_text}"
                            </span>
                          )}
                        </div>

                        {/* Line 2: Linked entities + promote button */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40">
                          <div className="flex flex-wrap gap-1 items-center min-w-0 flex-1">
                            {marker.linked_entity_ids.length > 0 ? (
                              marker.linked_entity_ids.map((entId) => {
                                const matchedEnt = entities.find((e) => e.id === entId);
                                return (
                                  <Badge
                                    key={entId}
                                    variant="secondary"
                                    className="text-[10px] font-mono bg-surface-elevated border border-border rounded-squircle-sm"
                                  >
                                    <Link2 className="h-2.5 w-2.5 mr-1 text-muted-foreground" />
                                    {matchedEnt
                                      ? `${label("entity.type", matchedEnt.entity_type)}: ${matchedEnt.display_value}`
                                      : t("evidence_workspace.entity_id_ref")}
                                  </Badge>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] text-muted-foreground italic truncate">
                                  {t("evidence_workspace.no_entities_linked")}
                                </span>
                                <Select
                                  value=""
                                  onChange={(e) => handleLinkMarker(marker.id, e.target.value)}
                                  className="h-6 py-0 px-1.5 text-[10px] w-auto bg-background rounded-squircle-sm border border-border focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  <option value="" disabled>
                                    {t("evidence_workspace.link_short")}
                                  </option>
                                  {entities.map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.display_value}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isPromoted ? (
                              <span className="text-[10px] text-success font-bold flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> {t("evidence_workspace.added_to_diary")}
                              </span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handlePromoteMarker(marker.id, marker.transcript_text)}
                                className="h-6 px-2 text-[10px] font-bold rounded-squircle-sm flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              >
                                <FolderPlus className="h-3 w-3 text-primary" /> {t("evidence_workspace.add_to_diary")}
                              </Button>
                            )}
                          </div>
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
      <Toast message={toastMessage} />
    </div>
  );
}
