"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Network,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuditEvents, ApiError } from "@/lib/api";
import { useEnumLabel } from "@/lib/i18n/enums";
import { interpolate, useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import type { AuditEventOut } from "@/lib/types";

/**
 * Icon per action. Labels come from the `audit.actions.*` dictionary namespace,
 * shared with the case overview's activity log — this file previously carried its
 * own English-only label map, so the audit trail stayed in English for Hindi and
 * Gujarati users while every heading around it translated.
 *
 * The colour column that used to live here is gone. An append-only log is read
 * top-down for sequence, not scanned for category, and five hues across eleven
 * action types read as a legend nobody has.
 */
const ACTION_ICON: Record<string, React.ElementType> = {
  case_created: Plus,
  complaint_ingested: FileText,
  extraction_complete: Search,
  path_generated: Network,
  step_status_changed: CheckCircle2,
  request_created: FileText,
  request_approved: ShieldCheck,
  request_dispatched: Send,
  response_received: CheckCircle2,
  insights_regenerated: Sparkles,
  summary_generated: Sparkles,
};

export default function AuditPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t } = useLanguage();
  const { label: enumLabel } = useEnumLabel();
  const { formatRelative, formatDateTime } = useFormatters();

  const [events, setEvents] = useState<AuditEventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) void loadEvents();
  }, [caseId]);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getAuditEvents(caseId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("audit.load_error"));
    } finally {
      setLoading(false);
    }
  }

  const ordered = [...events].reverse();

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <PageHeader
        level="section"
        title={t("audit.title")}
        description={t("audit.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-squircle" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Network}
          title={t("audit.no_events")}
          description={t("audit.no_events_sub")}
        />
      ) : (
        <div className="relative">
          {/* The rail runs the length of the record: ingestion at the bottom,
              latest action at the top. Red-to-blue marks a traversed path, which
              is the one thing gradients are for in this system. */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-[11px] top-0 w-px"
            style={{ background: "var(--gradient-accent-info-v)" }}
          />

          <ol className="flex flex-col">
            {ordered.map((event, idx) => {
              const Icon = ACTION_ICON[event.action] ?? Clock;
              const isExpanded = expandedId === event.id;
              const isLatest = idx === 0;
              const detailKeys = Object.keys(event.detail);
              const hasDetail = detailKeys.length > 0;

              return (
                <li key={event.id} className="relative pb-4 pl-10">
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-3 z-10 flex h-[23px] w-[23px] items-center justify-center rounded-full border ${
                      isLatest
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>

                  <div
                    className={`rounded-squircle border p-4 transition-colors duration-200 ${
                      isLatest ? "border-primary/30 bg-card" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="font-heading text-sm font-semibold text-foreground">
                          {enumLabel("audit.actions", event.action)}
                        </p>
                        {isLatest && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {t("summary.latest")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {event.user_id && <User className="h-3 w-3" />}
                        <span className="whitespace-nowrap font-mono">
                          {formatRelative(event.created_at)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </p>

                    {hasDetail && (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          aria-expanded={isExpanded}
                          className="mt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {isExpanded ? t("common.collapse") : t("audit.expand")}
                        </button>

                        {isExpanded && (
                          <dl className="mt-3 flex flex-col gap-1 rounded-squircle-sm border border-border/60 bg-surface-alt p-3">
                            <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                              {t("audit.detail")}
                            </p>
                            {detailKeys.map((key) => (
                              <div key={key} className="flex gap-2 text-xs">
                                <dt className="min-w-24 shrink-0 font-mono text-muted-foreground">
                                  {key}
                                </dt>
                                <dd className="break-all font-mono text-foreground">
                                  {String(event.detail[key])}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="relative flex items-center gap-3 pl-10">
            <span
              aria-hidden="true"
              className="absolute left-[6px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-border bg-background"
            />
            <p className="font-mono text-xs text-muted-foreground">{t("audit.case_opened")}</p>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <p className="text-center font-mono text-xs text-muted-foreground">
          {interpolate(t("audit.events_recorded"), { count: events.length })}
        </p>
      )}
    </div>
  );
}
