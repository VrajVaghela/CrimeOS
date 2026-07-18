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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface EvidenceReviewWorkspaceProps {
  evidence: EvidenceOut;
  onRefresh: () => void;
}

export function EvidenceReviewWorkspace({ evidence, onRefresh }: EvidenceReviewWorkspaceProps) {
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
        title: "Missing Content",
        description: "Please specify transcript segment text to highlight.",
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
        title: "Marker Created",
        description: "Evidence marker segment successfully added.",
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
        title: "Error creating marker",
        description: err instanceof ApiError ? err.message : "Failed to save marker.",
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
        title: "Entity Linked",
        description: "Successfully linked evidence marker to case entity.",
      });
      onRefresh();
    } catch (err) {
      toast({
        title: "Linking failed",
        description: err instanceof ApiError ? err.message : "Failed to link entity.",
        variant: "destructive",
      });
    }
  };

  const handlePromoteMarker = async (markerId: string, textSnippet: string | null) => {
    try {
      const note = textSnippet
        ? `Fact verified: "${textSnippet}"`
        : "Evidence marker promoted to Case Diary.";
      await promoteEvidenceMarker(markerId, note);
      
      setPromotedMarkers((prev) => ({ ...prev, [markerId]: true }));
      toast({
        title: "Added to Case Diary",
        description: "This fact is now logged on the case timeline / audit trail.",
      });
      onRefresh();
    } catch (err) {
      toast({
        title: "Promotion failed",
        description: err instanceof ApiError ? err.message : "Failed to promote marker.",
        variant: "destructive",
      });
    }
  };

  const highConfidence = evidence.ai_tags?.confidence >= 0.85;

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
              <span>TYPE: {evidence.file_type?.toUpperCase() || "UNKNOWN"}</span>
              <span>•</span>
              <span>UPLOADED: {new Date(evidence.uploaded_at).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <Badge
          variant={highConfidence ? "success" : "warning"}
          className="text-xs font-mono py-1 px-2 uppercase font-semibold"
        >
          {Math.round((evidence.ai_tags?.confidence || 0) * 100)}% Analysis Conf
        </Badge>
      </div>

      {/* Main 2-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media & Forensic Profile */}
        <div className="lg:col-span-5 space-y-6">
<Card className="overflow-hidden border border-border/80 bg-background">
            <CardHeader className="pb-3 border-b border-border/20">
<CardTitle className="text-sm font-bold font-heading text-muted-foreground flex items-center gap-1.5">
                Original Media Source
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
                    Audio stream loaded. Use waveform controller above.
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
                  <p className="text-sm font-semibold text-foreground">Document File</p>
                  <a
                    href={`${API_URL}/${evidence.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                  >
                    Open Document in New Tab <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {!evidence.file_type && (
                <div className="text-center p-6 space-y-2">
<AlertTriangle className="h-10 w-10 text-warn mx-auto" />
<p className="text-xs text-warn font-bold uppercase">Fallback Processing Mode</p>
                  <p className="text-xs text-muted-foreground">
                    This file format is unsupported by standard auto-analysis. No transcription could be performed.
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
                AI Forensic Tag Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Description / विवरण
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {evidence.ai_tags?.description || "No description generated."}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Forensic Tags / टैग
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evidence.ai_tags?.tags?.map((t) => (
<Badge key={t} variant="secondary" className="text-[10px] uppercase font-mono bg-surface-elevated">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              {evidence.ai_tags?.flagged_features && evidence.ai_tags.flagged_features.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] font-bold text-destructive flex items-center gap-1 uppercase">
                    <AlertTriangle className="h-3.5 w-3.5" /> Flagged Forensic Anomalies
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
                  Forensic Content Review
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Transcript column */}
                <div className="space-y-2">
<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Original Transcript / Source Text
                  </span>
<div className="p-3 rounded-lg border border-border/40 bg-surface-alt/60 max-h-60 overflow-y-auto text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {evidence.transcript || "No transcript available."}
                  </div>
                </div>

                {/* Translation column */}
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4">
<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    English Translation / Context Summary
                  </span>
<div className="p-3 rounded-lg border border-border/40 bg-surface-alt/60 max-h-60 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-secondary-foreground">
                    {evidence.translation || "No translation translation available."}
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
                  <PlusCircle className="h-4 w-4 text-primary" /> Create Fact Citation Marker
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleCreateMarker} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Marker Type</label>
                    <select
                      value={markerType}
                      onChange={(e) => setMarkerType(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 focus:outline-none focus:border-primary"
                    >
                      <option value="transcript_segment">Transcript Segment</option>
                      <option value="audio_timestamp">Audio Timestamp</option>
                      <option value="video_timestamp">Video Timestamp</option>
                      <option value="visual_bounding_box">Visual Bounding Box</option>
                    </select>
                  </div>

                  {(markerType === "audio_timestamp" || markerType === "video_timestamp") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Start (ms)</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          value={startMs}
                          onChange={(e) => setStartMs(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 text-foreground"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">End (ms)</label>
                        <input
                          type="number"
                          placeholder="e.g. 15000"
                          value={endMs}
                          onChange={(e) => setEndMs(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Highlighted Text / Segment Details
                    </label>
                    <textarea
                      placeholder="Paste segment text or note detailing this marker..."
                      rows={3}
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Link Case Entity (Optional)
                    </label>
                    <select
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
className="w-full bg-surface-alt border border-border/60 text-xs rounded p-2 focus:outline-none focus:border-primary text-foreground"
                    >
                      <option value="">-- Do Not Link Entity --</option>
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.entity_type.toUpperCase()}: {ent.display_value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" disabled={creatingMarker} className="w-full text-xs h-9">
                    {creatingMarker ? "Adding Marker..." : "Pin Segment & Link"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* List of Markers */}
<Card className="border border-border/60 bg-background/30">
              <CardHeader className="pb-2 border-b border-border/20">
<CardTitle className="text-xs font-bold font-heading text-muted-foreground flex items-center gap-1.5">
<Bookmark className="h-4 w-4 text-success" /> Grounded Fact Markers ({markers.length})
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
                          <span className="font-mono text-[10px] text-primary uppercase font-bold bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                            {marker.marker_type.replace("_", " ")}
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
                            Linked Case Entities
                          </span>
                          <div className="flex flex-wrap gap-1 items-center">
                            {marker.linked_entity_ids.length > 0 ? (
                              marker.linked_entity_ids.map((entId) => {
                                const matchedEnt = entities.find((e) => e.id === entId);
                                return (
<Badge key={entId} variant="secondary" className="text-[9px] font-mono bg-surface-elevated border border-border">
<Link2 className="h-2 w-2 mr-1 text-muted-foreground" />
                                    {matchedEnt ? `${matchedEnt.entity_type}: ${matchedEnt.display_value}` : "Entity ID Ref"}
                                  </Badge>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-1.5 w-full">
                                <span className="text-[10px] text-muted-foreground italic">No entities linked.</span>
                                <select
                                  onChange={(e) => handleLinkMarker(marker.id, e.target.value)}
                                  defaultValue=""
className="bg-background border border-border text-[10px] rounded p-0.5 focus:outline-none"
                                >
                                  <option value="" disabled>Link...</option>
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
                              <CheckCircle className="h-3.5 w-3.5" /> Added to Case Diary
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePromoteMarker(marker.id, marker.transcript_text)}
                              className="text-[10px] font-bold text-primary hover:text-primary-foreground hover:bg-primary/20 border border-primary/30 rounded px-2 py-0.5 transition-all flex items-center gap-1"
                            >
                              <FolderPlus className="h-3 w-3" /> Add to Case Diary
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {markers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs font-mono">
                      No pinned facts on this file yet. Create one to cite facts.
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
