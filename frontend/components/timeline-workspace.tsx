"use client";

import { useCallback, useRef, useState } from "react";
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
  User,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { addTimelineNote, ApiError, uploadCctvFrame } from "@/lib/api";
import type {
  CctvAnalysisDetail,
  CctvPinOut,
  TimelineEventOut,
  TimelineEventType,
} from "@/lib/types";
import { useLanguage, type TranslationKey } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import { TranslatedTextBlock } from "@/components/translated-text-block";

// ──────────────────────────────────────────────────────────────────────────────
// Event vocabulary
//
// Event type is a fact, so every type gets the same neutral badge and only the
// icon changes. The previous map gave each of the eight types its own hue and
// tinted badge, which turned a chronological record into a colour legend the
// reader had to learn, and spent Info Blue, Emerald, and Alert Red on rows where
// none of them meant anything.
//
// Provenance is the distinction that matters on this surface, and it is carried
// once — by the "AI generated" mark.
// ──────────────────────────────────────────────────────────────────────────────

const EVENT_ICON: Record<TimelineEventType, React.ElementType> = {
  complaint_filed: FileText,
  entity_extracted: Radar,
  path_generated: Zap,
  step_completed: CheckCircle2,
  request_dispatched: Radar,
  response_received: CheckCircle2,
  cctv_frame: Camera,
  officer_note: MessageSquarePlus,
};

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number | null }) {
  const { t } = useLanguage();
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const cls = pct >= 85 ? "text-success" : pct >= 70 ? "text-warn" : "text-destructive";
  return (
    <span className={`font-mono text-xs ${cls}`} title={t("timeline.ai_confidence")}>
      {pct}% {t("path.conf_short")}
    </span>
  );
}

function TimelineNode({ event }: { event: TimelineEventOut }) {
  const { t } = useLanguage();
  const { formatDateTime: formatTime } = useFormatters();
  const [expanded, setExpanded] = useState(false);
  const Icon = EVENT_ICON[event.event_type] ?? MessageSquarePlus;
  const isAi = event.ai_generated;
  const isCctv = event.event_type === "cctv_frame";
  const cctv = event.cctv_analysis as CctvAnalysisDetail | null;
  const typeLabel = t(`timeline.event.${event.event_type}` as TranslationKey);

  return (
    <li className="group relative flex gap-4">
      {/* Rail: a machine-authored event gets an Info Blue node, a human-authored
          one a neutral node. That is the only colour distinction on the rail. */}
      <div className="flex shrink-0 flex-col items-center">
        <span
          aria-hidden="true"
          className={`z-10 mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
            isAi ? "bg-info" : "bg-muted-foreground"
          }`}
        />
        <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border group-last:hidden" />
      </div>

      <div
        className={`mb-6 flex-1 rounded-squircle border bg-card p-4 transition-colors duration-200 ${
          isAi ? "border-info/25" : "border-border"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              <Icon className="h-3 w-3" />
              {typeLabel}
            </span>
            {isAi && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-info">
                <Sparkles className="h-3 w-3" />
                {t("timeline.ai_generated")}
              </span>
            )}
            <ConfidenceBadge value={event.confidence} />
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatTime(event.occurred_at)}
          </span>
        </div>

        <div className="mt-2 font-heading text-sm font-semibold">
          <TranslatedTextBlock content={event.title} />
        </div>

        {event.location && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
            <MapPin className="h-3 w-3" />
            {event.location}
          </div>
        )}

        <div className="mt-2 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
          <TranslatedTextBlock content={event.description} />
        </div>

        {isCctv && cctv && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1 text-xs text-info transition-colors hover:text-info/80 font-medium"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? t("timeline.cctv_hide_detail") : t("timeline.cctv_show_detail")}
            </button>
            {expanded && (
              <div className="mt-3 flex flex-col gap-3 rounded-squircle-sm border border-border/60 bg-surface-alt/50 p-4">
                <div className="grid grid-cols-2 gap-3 rounded-squircle-sm border border-border/40 bg-background/50 p-2.5 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-[11px]">{t("timeline.osd_timestamp")}</p>
                    <p className="font-mono text-foreground">{cctv.detected_timestamp}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-[11px]">{t("timeline.confidence")}</p>
                    <ConfidenceBadge value={cctv.confidence} />
                  </div>
                </div>
                {cctv.persons_detected.length > 0 && (
                  <div className="rounded-squircle-sm border border-border/30 bg-background/30 p-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      <User className="h-3 w-3 inline mr-1" />
                      {t("timeline.persons_detected")}
                    </p>
                    <ul className="space-y-0.5 pl-1">
                      {cctv.persons_detected.map((p, i) => (
                        <li key={i} className="text-xs text-foreground font-mono">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cctv.vehicles_detected.length > 0 && (
                  <div className="rounded-squircle-sm border border-border/30 bg-background/30 p-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("timeline.vehicles")}</p>
                    <ul className="space-y-0.5 pl-1">
                      {cctv.vehicles_detected.map((v, i) => (
                        <li key={i} className="text-xs text-foreground font-mono">• {v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cctv.forensic_flags.length > 0 && (
                  <div className="rounded-squircle-sm border border-warn/25 bg-warn/5 p-2.5">
                    <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-warn">
                      <AlertTriangle className="h-3 w-3 text-warn" />
                      {t("timeline.forensic_flags")}
                    </p>
                    <ul className="flex flex-col gap-0.5 pl-1">
                      {cctv.forensic_flags.map((f) => (
                        <li key={f} className="text-xs text-warn font-mono">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
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
  const { t } = useLanguage();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CctvPinOut | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError(t("timeline.cctv_unsupported"));
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const result = await uploadCctvFrame(caseId, file);
        setLastResult(result);
        onPinned(result);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t("timeline.cctv_upload_failed"));
      } finally {
        setUploading(false);
      }
    },
    [caseId, onPinned, t],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("timeline.upload_cctv")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-squircle border border-dashed px-6 py-5 text-center transition-colors duration-200 ${
          dragging
            ? "border-primary bg-primary/[0.06]"
            : "border-border bg-surface-alt/40 hover:border-border/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
          id="cctv-upload-input"
        />
        <Camera className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            {uploading ? (
              <span className="flex items-center gap-2 text-info">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("timeline.analyzing_cctv")}
              </span>
            ) : (
              t("timeline.cctv_drop_hint")
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("timeline.cctv_drop_sub")}</p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-squircle-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {lastResult && !uploading && (
        <div className="flex flex-col gap-3 rounded-squircle border border-success/30 bg-success/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            {t("timeline.pin_success")}
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-squircle-sm border border-border/30 bg-background/40 p-2.5 text-xs">
            <div>
              <p className="mb-0.5 text-muted-foreground text-[11px]">{t("timeline.osd_timestamp")}</p>
              <p className="font-mono">{lastResult.analysis.detected_timestamp}</p>
            </div>
            <div>
              <p className="mb-0.5 text-muted-foreground text-[11px]">{t("timeline.location")}</p>
              <p className="leading-snug">{lastResult.analysis.location_description}</p>
            </div>
          </div>
          {lastResult.analysis.forensic_flags.length > 0 && (
            <div className="rounded-squircle-sm border border-warn/25 bg-warn/5 p-2.5">
              <p className="mb-1 text-[11px] font-semibold text-warn flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warn" />
                {t("timeline.forensic_flags")}
              </p>
              {lastResult.analysis.forensic_flags.map((f) => (
                <p key={f} className="text-xs text-warn font-mono">
                  • {f}
                </p>
              ))}
            </div>
          )}
          {lastResult.event.location && (
            <div className="inline-flex items-center gap-1 self-start rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
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
  const { t } = useLanguage();
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
      setError(e instanceof ApiError ? e.message : t("timeline.note_save_failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-title" required>
          {t("timeline.note_title_label")}
        </Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("timeline.note_title_placeholder")}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-desc" required>
          {t("timeline.note_desc_label")}
        </Label>
        <Textarea
          id="note-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t("timeline.note_desc_placeholder")}
          className="resize-none"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note-time" required>
            {t("timeline.note_occurred_at")}
          </Label>
          <Input
            id="note-time"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note-location">{t("timeline.note_location")}</Label>
          <Input
            id="note-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("timeline.note_location_placeholder")}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={saving || !title.trim() || !desc.trim()}
        loading={saving}
        className="w-full"
        id="add-officer-note-btn"
      >
        {!saving && <MessageSquarePlus className="h-3.5 w-3.5" />}
        {saving ? t("common.saving") : t("timeline.add_note_submit")}
      </Button>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Timeline Workspace Main Component
// ──────────────────────────────────────────────────────────────────────────────

interface TimelineWorkspaceProps {
  caseId: string;
  events: TimelineEventOut[];
  loading: boolean;
  error: string | null;
  synthesizing: boolean;
  onRefresh: () => void;
  onPinned: (result: CctvPinOut) => void;
  onNoteAdded: (event: TimelineEventOut) => void;
}

export function TimelineWorkspace({
  caseId,
  events,
  loading,
  error,
  synthesizing,
  onRefresh,
  onPinned,
  onNoteAdded,
}: TimelineWorkspaceProps) {
  const { t } = useLanguage();
  const cctvCount = events.filter((e) => e.event_type === "cctv_frame").length;
  const locationsSet = new Set(events.map((e) => e.location).filter((l) => Boolean(l)));

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <PageHeader
        level="section"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("timeline.title")}
            <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
              <Sparkles className="h-3 w-3" />
              {t("timeline.ai_synthesized")}
            </span>
          </span>
        }
        description={
          <>
            {t("timeline.subtitle")}
            {!loading && events.length > 0 && (
              // Label before count, so the line stays grammatical at one as well
              // as many. "1 CCTV frames" was wrong in English and unfixable in
              // Hindi and Gujarati without full plural rules for a stat line.
              <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
                <span>
                  {t("timeline.events_counted")} <span className="text-foreground">{events.length}</span>
                </span>
                {cctvCount > 0 && (
                  <span>
                    {t("timeline.cctv_frames_counted")}{" "}
                    <span className="text-foreground">{cctvCount}</span>
                  </span>
                )}
                {locationsSet.size > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {t("timeline.locations_counted")}{" "}
                    <span className="text-foreground">{locationsSet.size}</span>
                  </span>
                )}
              </span>
            )}
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            loading={loading}
            id="refresh-timeline-btn"
          >
            {!loading && <Zap className="h-3.5 w-3.5" />}
            {t("timeline.re_synthesize")}
          </Button>
        }
      />

      {synthesizing && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-squircle border border-info/30 bg-info/[0.04] px-4 py-3 text-sm"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" />
          <div>
            <p className="font-medium text-foreground">{t("timeline.synthesizing")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("timeline.synthesizing_sub")}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_360px]">
        {/* ── Left: Timeline nodes ── */}
        <div>
          {!loading && events.length > 0 && (
            <div className="mb-5 flex items-start gap-2 rounded-squircle-sm border border-info/25 bg-info/[0.04] px-3 py-2 text-xs leading-relaxed text-secondary-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <span>{t("timeline.ai_provenance")}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="mt-1 w-px flex-1" />
                  </div>
                  <Skeleton className="h-24 flex-1 rounded-squircle" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">{t("timeline.load_failed")}</p>
                <p className="mt-0.5 text-xs text-destructive/70">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="ml-auto shrink-0 text-destructive hover:bg-destructive/10"
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={t("timeline.no_events")}
              description={t("timeline.no_events_sub")}
            />
          ) : (
            <ol>
              {events.map((event) => (
                <TimelineNode key={event.id} event={event} />
              ))}
            </ol>
          )}
        </div>

        {/* ── Right: input panels ── */}
        <div className="flex flex-col gap-5 xl:sticky xl:top-6">
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-sm font-semibold">{t("timeline.cctv_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("timeline.cctv_subtitle")}</p>
            </div>
            <CctvPanel caseId={caseId} onPinned={onPinned} />
            <details className="group rounded-squircle-sm border border-border/60 bg-surface-alt/40 text-xs transition-colors">
              <summary className="flex cursor-pointer list-none items-center justify-between p-3 font-medium text-foreground hover:text-info">
                <span className="flex items-center gap-1.5 font-heading text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-info" />
                  {t("timeline.how_it_works")}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ol className="flex flex-col gap-1.5 border-t border-border/40 px-3 py-2.5 leading-relaxed text-muted-foreground">
                <li>{t("timeline.cctv_step1")}</li>
                <li>{t("timeline.cctv_step2")}</li>
                <li>{t("timeline.cctv_step3")}</li>
              </ol>
            </details>
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-sm font-semibold">{t("timeline.officer_note")}</h2>
              <p className="text-xs text-muted-foreground">{t("timeline.officer_note_sub")}</p>
            </div>
            <OfficerNoteForm caseId={caseId} onAdded={onNoteAdded} />
          </Card>

          {locationsSet.size > 0 && (
            <Card className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t("timeline.locations")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...locationsSet].map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                  >
                    <MapPin className="h-2.5 w-2.5" />
                    {loc}
                  </span>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("timeline.locations_sub")}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
