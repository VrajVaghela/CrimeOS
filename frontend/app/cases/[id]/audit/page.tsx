"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Network,
  Plus,
  FileText,
  Send,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Search,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import { getAuditEvents, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import type { AuditEventOut } from "@/lib/types";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  case_created: { icon: Plus, color: "text-primary", label: "Case Created" },
  complaint_ingested: { icon: FileText, color: "text-accent", label: "Complaint Ingested" },
  extraction_complete: { icon: Search, color: "text-accent", label: "Entities Extracted" },
  path_generated: { icon: Network, color: "text-primary", label: "Investigation Path Generated" },
  step_status_changed: { icon: CheckCircle2, color: "text-success", label: "Step Status Updated" },
  request_created: { icon: FileText, color: "text-muted-foreground", label: "Legal Request Created" },
  request_approved: { icon: ShieldCheck, color: "text-success", label: "Request Approved" },
  request_dispatched: { icon: Send, color: "text-primary", label: "Request Dispatched" },
  response_received: { icon: CheckCircle2, color: "text-success", label: "Provider Response Received" },
  insights_regenerated: { icon: Sparkles, color: "text-primary", label: "Insights Regenerated" },
  summary_generated: { icon: Sparkles, color: "text-primary", label: "Case Summary Generated" },
};

function getActionConfig(action: string) {
  return (
    ACTION_CONFIG[action] ?? {
      icon: Clock,
      color: "text-muted-foreground",
      label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }
  );
}

function getActionColor(action: string): string {
  if (["case_created", "request_dispatched", "insights_regenerated", "summary_generated", "path_generated"].includes(action)) return "bg-primary";
  if (["complaint_ingested", "extraction_complete"].includes(action)) return "bg-info";
  if (["step_status_changed", "request_approved", "response_received"].includes(action)) return "bg-success";
  if (["request_created"].includes(action)) return "bg-accent";
  return "bg-muted";
}

function formatRelativeTime(dateStr: string, t: any, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}${t("common.s")} ${t("common.ago")}`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}${t("common.m")} ${t("common.ago")}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}${t("common.h")} ${t("common.ago")}`;
  return date.toLocaleDateString(lang === "hi" ? "hi-IN" : (lang === "gu" ? "gu-IN" : "en-IN"), { day: "2-digit", month: "short", year: "numeric" });
}

export default function AuditPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t, lang } = useLanguage();

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
      const data = await getAuditEvents(caseId);
      setEvents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {t("audit.title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("audit.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadEvents}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
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
          <p className="text-sm text-muted-foreground">Loading audit events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border/60 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Network className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-heading font-semibold text-lg">{t("audit.no_events")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("audit.no_events_sub")}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border/60" />

          <div className="flex flex-col gap-0">
            {[...events].reverse().map((event, idx) => {
              const config = getActionConfig(event.action);
              const Icon = config.icon;
              const isExpanded = expandedId === event.id;
              const detailKeys = Object.keys(event.detail);

              return (
                <div
                  key={event.id}
                  className="relative flex gap-4 pb-6 pl-12 animate-fade-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Timeline node — color-coded by action type */}
                  <div
                    className={[
                      "absolute left-2.5 top-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center z-10 transition-all duration-300",
                      idx === 0 ? getActionColor(event.action) + " shadow-[0_0_0_4px] shadow-primary/20" : "bg-card",
                    ].join(" ")}
                  >
                    <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                  </div>

                  {/* Event card */}
                  <div
                    className={[
                      "flex-1 rounded-xl border p-4 transition-all cursor-pointer",
                      idx === 0
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border/60 hover:border-primary/30 hover:bg-primary/5",
                    ].join(" ")}
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                        <div className="font-heading text-sm font-semibold text-foreground truncate">
                          <TranslatedTextBlock content={config.label} autoTranslate={true} />
                        </div>
                        {idx === 0 && (
                          <Badge variant="info" className="text-[10px] font-mono shrink-0">
                            {t("summary.latest")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                        {event.user_id && <User className="h-3 w-3" />}
                        <span className="font-mono whitespace-nowrap">{formatRelativeTime(event.created_at, t, lang)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {new Date(event.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                    </p>

                    {/* Detail expansion */}
                    {detailKeys.length > 0 && (
                      <div
                        className={[
                          "overflow-hidden transition-all duration-300",
                          isExpanded ? "max-h-96 mt-3" : "max-h-0",
                        ].join(" ")}
                      >
                        <div className="bg-muted/50 border border-border/60 rounded-lg p-3 space-y-1">
                          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                            {t("audit.detail")}
                          </p>
                          {detailKeys.map((key) => (
                            <div key={key} className="flex gap-2 text-xs">
                              <span className="text-muted-foreground font-mono min-w-24 shrink-0">
                                {key}
                              </span>
                              <span className="text-foreground font-mono break-all">
                                {String(event.detail[key])}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailKeys.length > 0 && !isExpanded && (
                      <p className="text-[10px] text-muted-foreground mt-2 hover:text-primary transition-colors">
                        {t("audit.expand")} →
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline footer */}
          <div className="flex items-center gap-2 pl-12 mt-2">
            <div className="h-3 w-3 rounded-full bg-muted border border-border/60" />
            <p className="text-xs text-muted-foreground font-mono">Case opened</p>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <p className="text-xs text-muted-foreground text-center font-mono">
          {events.length} event{events.length !== 1 ? "s" : ""} recorded · Append-only audit log
        </p>
      )}
    </div>
  );
}
