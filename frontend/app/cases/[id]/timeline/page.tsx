"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Radar,
  Sparkles,
  Upload,
  User,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  addTimelineNote,
  ApiError,
  getCaseTimeline,
  uploadCctvFrame,
} from "@/lib/api";
import type {
  CctvAnalysisDetail,
  CctvPinOut,
  TimelineEventOut,
  TimelineEventType,
} from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────────────
// Token maps — all colours via token classes, never raw hex
// ──────────────────────────────────────────────────────────────────────────────

const EVENT_META: Record<
  TimelineEventType,
  { label: string; icon: React.ElementType; dotClass: string; borderClass: string; badgeClass: string }
> = {
  complaint_filed: {
    label: "Complaint Filed",
    icon: FileText,
    dotClass: "bg-info",
    borderClass: "border-info/40",
    badgeClass: "bg-info/15 text-info border-info/30",
  },
  entity_extracted: {
    label: "Entities Extracted",
    icon: Radar,
    dotClass: "bg-primary",
    borderClass: "border-primary/40",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  path_generated: {
    label: "Path Generated",
    icon: Zap,
    dotClass: "bg-violet",
    borderClass: "border-violet/40",
    badgeClass: "bg-violet/15 text-violet border-violet/30",
  },
  step_completed: {
    label: "Step Completed",
    icon: CheckCircle2,
    dotClass: "bg-success",
    borderClass: "border-success/40",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  request_dispatched: {
    label: "Request Dispatched",
    icon: Radar,
    dotClass: "bg-accent",
    borderClass: "border-accent/40",
    badgeClass: "bg-accent/15 text-accent-foreground border-accent/30",
  },
  response_received: {
    label: "Response Received",
    icon: CheckCircle2,
    dotClass: "bg-success",
    borderClass: "border-success/40",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  cctv_frame: {
    label: "CCTV Frame",
    icon: Camera,
    dotClass: "bg-rose animate-pulse",
    borderClass: "border-rose/40",
    badgeClass: "bg-rose/15 text-rose border-rose/30",
  },
  officer_note: {
    label: "Officer Note",
    icon: MessageSquarePlus,
    dotClass: "bg-muted-foreground",
    borderClass: "border-border",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const cls =
    pct >= 85
      ? "text-success"
      : pct >= 70
      ? "text-accent"
      : "text-destructive";
  return (
    <span className={`font-mono text-xs ${cls}`} title="AI confidence">
      {pct}% conf.
    </span>
  );
}

function TimelineNode({ event }: { event: TimelineEventOut }) {
  const [expanded, setExpanded] = useState(false);
  const meta = EVENT_META[event.event_type] ?? EVENT_META.officer_note;
  const Icon = meta.icon;
  const isAi = event.ai_generated;
  const isCctv = event.event_type === "cctv_frame";
  const cctv = event.cctv_analysis as CctvAnalysisDetail | null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="relative flex gap-4 group animate-fade-up">
      {/* Connector dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`h-3 w-3 rounded-full mt-1 ring-2 ring-background z-10 ${meta.dotClass}`}
        />
        <div className="w-px flex-1 bg-border/50 group-last:hidden mt-1" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-6 rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 ${
          isCctv
            ? "border-rose/40 hover:border-rose/70 hover:glow-rose"
            : isAi
            ? "border-primary/25 hover:border-primary/50"
            : "border-border hover:border-border/80"
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            {isAi && (
              <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                <Sparkles className="h-3 w-3" />
                AI-generated
              </span>
            )}
            <ConfidenceBadge value={event.confidence} />
          </div>
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {formatTime(event.occurred_at)}
          </span>
        </div>

        {/* Title */}
        <p className="mt-2 text-sm font-semibold font-heading">{event.title}</p>

        {/* Location chip */}
        {event.location && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary">
            <MapPin className="h-3 w-3" />
            {event.location}
          </div>
        )}

        {/* Description */}
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          {event.description}
        </p>

        {/* CCTV details — expand/collapse */}
        {isCctv && cctv && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} CCTV Intelligence
            </button>
            {expanded && (
              <div className="mt-3 rounded-lg border border-rose/20 bg-rose/5 p-3 space-y-2 animate-fade-up">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">OSD Timestamp</p>
                    <p className="font-mono text-foreground">{cctv.detected_timestamp}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Confidence</p>
                    <ConfidenceBadge value={cctv.confidence} />
                  </div>
                </div>
                {cctv.persons_detected.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <User className="h-3 w-3 inline mr-1" />
                      Persons Detected
                    </p>
                    <ul className="space-y-0.5">
                      {cctv.persons_detected.map((p, i) => (
                        <li key={i} className="text-xs text-foreground">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cctv.vehicles_detected.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Vehicles</p>
                    <ul className="space-y-0.5">
                      {cctv.vehicles_detected.map((v, i) => (
                        <li key={i} className="text-xs text-foreground">• {v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cctv.forensic_flags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <AlertTriangle className="h-3 w-3 inline mr-1 text-accent" />
                      Forensic Flags
                    </p>
                    <ul className="space-y-0.5">
                      {cctv.forensic_flags.map((f, i) => (
                        <li key={i} className="text-xs text-accent">▲ {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CCTV Upload Panel
// ──────────────────────────────────────────────────────────────────────────────

function CctvPanel({
  caseId,
  onPinned,
}: {
  caseId: string;
  onPinned: (result: CctvPinOut) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CctvPinOut | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Only JPEG, PNG, or WebP images are supported.");
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const result = await uploadCctvFrame(caseId, file);
        setLastResult(result);
        onPinned(result);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Upload failed. Try again.");
      } finally {
        setUploading(false);
      }
    },
    [caseId, onPinned]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center ${
          dragging
            ? "border-rose/70 bg-rose/10 glow-rose"
            : "border-border hover:border-rose/40 hover:bg-rose/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
          id="cctv-upload-input"
        />
        <div className={`rounded-full p-3 ${dragging ? "bg-rose/20" : "bg-muted"}`}>
          <Camera className={`h-6 w-6 ${dragging ? "text-rose" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="text-sm font-medium">
            {uploading ? (
              <span className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing CCTV frame via Gemini Vision…
              </span>
            ) : (
              "Drop CCTV frame here or click to upload"
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPEG / PNG / WebP · max 20 MB · Gemini Vision extracts location, persons, vehicles
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Last analysis result preview */}
      {lastResult && !uploading && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 text-success text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Frame Pinned to Timeline
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">OSD Timestamp</p>
              <p className="font-mono">{lastResult.analysis.detected_timestamp}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Location</p>
              <p className="leading-snug">{lastResult.analysis.location_description}</p>
            </div>
          </div>
          {lastResult.analysis.forensic_flags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Forensic Flags</p>
              {lastResult.analysis.forensic_flags.map((f, i) => (
                <p key={i} className="text-xs text-accent">▲ {f}</p>
              ))}
            </div>
          )}
          {lastResult.event.location && (
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary">
              <MapPin className="h-3 w-3" />
              {lastResult.event.location}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Officer Note Form
// ──────────────────────────────────────────────────────────────────────────────

function OfficerNoteForm({
  caseId,
  onAdded,
}: {
  caseId: string;
  onAdded: (event: TimelineEventOut) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const event = await addTimelineNote(caseId, {
        title: title.trim(),
        description: desc.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
        location: location.trim() || null,
      });
      onAdded(event);
      setTitle("");
      setDesc("");
      setLocation("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="note-title" className="text-xs text-muted-foreground mb-1 block">
          Note Title *
        </Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Officer visited crime scene"
          className="h-9 text-sm"
          required
        />
      </div>
      <div>
        <Label htmlFor="note-desc" className="text-xs text-muted-foreground mb-1 block">
          Description *
        </Label>
        <Textarea
          id="note-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe the observation or action taken…"
          className="text-sm min-h-[80px] resize-none"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="note-time" className="text-xs text-muted-foreground mb-1 block">
            Date & Time *
          </Label>
          <Input
            id="note-time"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div>
          <Label htmlFor="note-location" className="text-xs text-muted-foreground mb-1 block">
            Location (optional)
          </Label>
          <Input
            id="note-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Vastrapur, Ahmedabad"
            className="h-9 text-sm"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <Button
        type="submit"
        disabled={saving || !title.trim() || !desc.trim()}
        className="w-full h-9 gap-2"
        id="add-officer-note-btn"
      >
        {saving ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
        ) : (
          <><MessageSquarePlus className="h-3.5 w-3.5" /> Add Note to Timeline</>
        )}
      </Button>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params = useParams();
  const caseId = params.id as string;

  const [events, setEvents] = useState<TimelineEventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSynthesizing(true);
    try {
      const data = await getCaseTimeline(caseId);
      setEvents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load timeline.");
    } finally {
      setLoading(false);
      setSynthesizing(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  function handlePinned(result: CctvPinOut) {
    setEvents((prev) =>
      [...prev, result.event].sort(
        (a, b) =>
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      )
    );
  }

  function handleNoteAdded(event: TimelineEventOut) {
    setEvents((prev) =>
      [...prev, event].sort(
        (a, b) =>
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      )
    );
  }

  const cctvCount = events.filter((e) => e.event_type === "cctv_frame").length;
  const locationsSet = new Set(
    events.map((e) => e.location).filter(Boolean)
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-violet" />
            <h1 className="font-heading text-xl font-bold">
              Timeline Agent
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary font-medium">
              <Sparkles className="h-3 w-3" />
              AI-Synthesized
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Chronological intelligence view — AI synthesizes case events · Upload CCTV frames to pinpoint locations
          </p>
          {/* Stats row */}
          {!loading && events.length > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-mono">
              <span>{events.length} events</span>
              {cctvCount > 0 && <span className="text-rose">{cctvCount} CCTV frames</span>}
              {locationsSet.size > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  <MapPin className="h-3 w-3" />
                  {locationsSet.size} location{locationsSet.size !== 1 ? "s" : ""} identified
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          id="refresh-timeline-btn"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          Re-Synthesize
        </Button>
      </div>

      {/* Synthesizing banner */}
      {synthesizing && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary animate-pulse-glow">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <div>
            <p className="font-medium">Timeline Agent is synthesizing…</p>
            <p className="text-xs text-primary/70 mt-0.5">
              Gemini is reading your case data and building the chronological event chain.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── Left: Timeline ── */}
        <div>
          {/* AI provenance strip */}
          {!loading && events.length > 0 && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                AI-suggested · sourced from complaint text, path steps, legal requests, and audit events.
                CCTV events include Gemini Vision analysis.
              </span>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="w-px flex-1 mt-1" />
                  </div>
                  <Skeleton className={`flex-1 rounded-xl h-24 stagger-${i + 1}`} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Failed to load timeline</p>
                <p className="text-xs text-destructive/70 mt-0.5">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={load}
                className="ml-auto text-destructive hover:bg-destructive/10"
              >
                Retry
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                Ingest a complaint and generate an investigation path — the Timeline Agent will synthesize events automatically.
              </p>
            </div>
          ) : (
            <div>
              {events.map((event) => (
                <TimelineNode key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: CCTV + Officer Notes ── */}
        <div className="space-y-5 xl:sticky xl:top-24">
          {/* CCTV Intelligence Card */}
          <Card className="p-5 border border-rose/20 space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose/15 p-1.5">
                <Camera className="h-4 w-4 text-rose" />
              </div>
              <div>
                <h2 className="text-sm font-semibold font-heading">CCTV Intelligence</h2>
                <p className="text-xs text-muted-foreground">Upload footage frames to pinpoint locations</p>
              </div>
            </div>
            <CctvPanel caseId={caseId} onPinned={handlePinned} />
            {/* How it works */}
            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-1.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">How it works</p>
              <p>1. Upload any CCTV still frame (JPEG/PNG)</p>
              <p>2. Gemini Vision extracts OSD timestamp, visible location cues, persons, vehicles, and forensic flags</p>
              <p>3. The event is pinned on the timeline at the detected real-world time</p>
            </div>
          </Card>

          <Separator className="opacity-30" />

          {/* Officer Note Card */}
          <Card className="p-5 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-1.5">
                <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold font-heading">Officer Note</h2>
                <p className="text-xs text-muted-foreground">Add manual observations to the timeline</p>
              </div>
            </div>
            <OfficerNoteForm caseId={caseId} onAdded={handleNoteAdded} />
          </Card>

          {/* Location summary */}
          {locationsSet.size > 0 && (
            <Card className="p-4 border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold font-heading">
                <MapPin className="h-4 w-4 text-primary" />
                Locations Identified
              </div>
              <div className="flex flex-wrap gap-2">
                {[...locationsSet].map((loc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary"
                  >
                    <MapPin className="h-2.5 w-2.5" />
                    {loc}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Derived from CCTV analysis and complaint entities. Locations marked on events above.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
