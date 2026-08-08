import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import { useRouter } from "next/navigation";
import {
  Shield,
  Activity,
  Mail,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowSpine } from "@/components/workflow-spine";
import { NextBestAction } from "@/components/next-best-action";
import { StatusBadge } from "@/components/status-badge";
import {
  ApiError,
  getCommandCenter,
  getCase,
  getRequests,
  getCaseResponses,
  getCaseEntities,
  getEntityRelationships,
  getRelatedCases,
  syncEntities,
  getCaseSummaries,
} from "@/lib/api";
import type {
  CommandCenterOut,
  CaseDetailOut,
  LegalRequestOut,
  ProviderResponseOut,
  CaseEntityOut,
  EntityRelationshipOut,
  RelatedCaseOut,
  CaseSummaryOut,
} from "@/lib/types";
import { EntityPivotPanel } from "@/components/entity-pivot-panel";
import { TranslatedTextBlock } from "@/components/translated-text-block";

function AnimatedMetric({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Honor reduced-motion: land on the value immediately, no count-up.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      return;
    }
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    // rAF-driven count-up with ease-out so it decelerates into the final
    // number. Self-corrects to real elapsed time, so it never drifts or janks.
    const duration = 600;
    let raf = 0;
    let startTs = 0;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayValue(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="font-mono">{displayValue}{suffix}</span>;
}

interface CaseCommandCenterProps {
  caseId: string;
}

export function CaseCommandCenter({ caseId }: CaseCommandCenterProps) {
  const { t } = useLanguage();
  const { formatDateTime, formatTime } = useFormatters();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commandData, setCommandData] = useState<CommandCenterOut | null>(null);
  const [caseData, setCaseData] = useState<CaseDetailOut | null>(null);
  const [requests, setRequests] = useState<LegalRequestOut[]>([]);
  const [responses, setResponses] = useState<ProviderResponseOut[]>([]);
  const [entities, setEntities] = useState<CaseEntityOut[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationshipOut[]>([]);
  const [relatedCases, setRelatedCases] = useState<RelatedCaseOut[]>([]);
  const [summaries, setSummaries] = useState<CaseSummaryOut[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cmd, details, reqs, resps, ents, rels, rcases, sums] = await Promise.all([
        getCommandCenter(caseId),
        getCase(caseId),
        getRequests(caseId),
        getCaseResponses(caseId),
        getCaseEntities(caseId),
        getEntityRelationships(caseId),
        getRelatedCases(caseId),
        getCaseSummaries(caseId).catch(() => []),
      ]);
      setCommandData(cmd);
      setCaseData(details);
      setRequests(reqs);
      setResponses(resps);
      setEntities(ents);
      setRelationships(rels);
      setRelatedCases(rcases);
      setSummaries(sums);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load command center data");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEntities = async () => {
    try {
      const updatedEnts = await syncEntities(caseId);
      setEntities(updatedEnts);
      const [rels, rcases] = await Promise.all([
        getEntityRelationships(caseId),
        getRelatedCases(caseId),
      ]);
      setRelationships(rels);
      setRelatedCases(rcases);
    } catch (e) {
      console.error("Failed to sync case entities:", e);
    }
  };

  useEffect(() => {
    if (caseId) {
      void loadData();
    }
  }, [caseId]);

  const handleActionExecute = (actionType: string) => {
    const mapping: Record<string, string> = {
      upload_complaint: "ingestion",
      verify_entities: "ingestion",
      generate_path: "path",
      draft_request: "requests",
      trigger_response: "responses",
      generate_summary: "summary",
    };
    const target = mapping[actionType];
    if (target) {
      router.push(`/cases/${caseId}/${target}`);
    }
  };

  // Complainants extraction
  const uniqueComplainants = Array.from(
    new Set(
      caseData?.complaints?.flatMap((c) =>
        c.entities
          .filter((e) => e.entity_type.toLowerCase() === "person")
          .map((e) => e.value)
      ) || []
    )
  );

  // Compute average entity confidence
  const avgEntityConf = (() => {
    if (entities.length > 0) {
      const sum = entities.reduce((acc, curr) => acc + curr.confidence, 0);
      return Math.round((sum / entities.length) * 100);
    }
    const allExtracted = caseData?.complaints?.flatMap((c) => c.entities) || [];
    if (allExtracted.length > 0) {
      const sum = allExtracted.reduce((acc, curr) => acc + curr.confidence, 0);
      return Math.round((sum / allExtracted.length) * 100);
    }
    return 0; // Default demo fallback confidence
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !commandData) {
    return (
      <div className="bg-destructive/15 border border-destructive/30 rounded-xl p-5 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm font-semibold text-destructive">{error || "Data not available"}</p>
        <Button onClick={() => void loadData()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const { workflow } = commandData;

  return (
    <div className="space-y-6">
      {/* Top Title Bar with Refresh */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t("command_center.title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            {t("command_center.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => void loadData()}
          variant="outline"
          size="sm"
          className="border-border/40 text-muted-foreground hover:text-foreground font-mono"
        >
          {t("command_center.refresh_control")}
        </Button>
      </div>

      {/* Case Workspace Hero Card - 2-column squircle layout collapses at 1080px */}
      <Card className="border border-border/60 bg-card rounded-squircle p-6">
        <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1.3fr_0.7fr] gap-6">
          {/* Left Column: 1.3fr */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-1 flex-wrap">
                <span className="text-accent-strong font-bold">{caseData?.case_number}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{caseData?.crime_type || "Awaiting Classification"}</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">{caseData?.title}</h3>
            </div>

            {/* Complainants list */}
            {uniqueComplainants.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold block mb-1">
                  {t('command_center.complainants' as any) || 'Complainants'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueComplainants.map((comp, idx) => (
                    <span key={idx} className="bg-secondary/60 px-2 py-0.5 rounded-squircle-sm text-xs font-mono border border-border/40 text-foreground">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary Block inside a left-bordered info blue block */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-info font-mono font-bold flex items-center gap-1 mb-1.5">
                <Sparkles className="h-3 w-3 text-info" />
                {t('command_center.ai_summary' as any) || 'AI Incident Executive Summary'}
              </span>
              <div className="border border-info/30 bg-info/[0.04] p-4 rounded-squircle-sm text-xs leading-relaxed text-foreground/90 font-sans">
                {summaries.length > 0 ? (
                  <TranslatedTextBlock content={summaries[0].content} />
                ) : (
                  t("command_center.ai_summary_empty")
                )}
              </div>
            </div>
          </div>

          {/* Right Column: 0.7fr */}
          <div className="flex flex-col justify-between border-t min-[1080px]:border-t-0 min-[1080px]:border-l border-border/30 pt-4 min-[1080px]:pt-0 min-[1080px]:pl-6 space-y-4">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold block mb-1">
                  {t('command_center.case_status' as any) || 'Case Status'}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={caseData?.status || "open"} />
                  {caseData?.status === "synced" && (
                    <span className="text-[10px] bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded font-mono">
                      {t("command_center.cctns_synced")}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold block mb-1">
                  {t('command_center.registered_date' as any) || 'Registered Date'}
                </span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {caseData?.created_at
                    ? formatDateTime(caseData.created_at)
                    : "—"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold block mb-1">
                  {t('command_center.officer_in_charge' as any) || 'Officer In Charge'}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {t("command_center.io_role")}
                </span>
              </div>
            </div>
            
            {/* Quick stats or minor visualization inside the hero right column */}
            <div className="bg-secondary/40 border border-border/30 rounded-squircle-sm p-3 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">{t("command_center.completion")}</span>
                <span className="text-accent-strong font-bold">{workflow.completion_percentage}%</span>
              </div>
              <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${workflow.completion_percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Restructured 4 Signal Cards in a Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 min-[1080px]:grid-cols-4 gap-4">
        {/* Card 1: Case Confidence */}
        <Card className="border border-border/60 bg-card hover:border-border transition-colors duration-150 rounded-squircle p-4">
          <CardContent className="p-0 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                {t('command_center.case_confidence' as any) || 'Case Confidence'}
              </span>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                <AnimatedMetric value={avgEntityConf} />%
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {avgEntityConf >= 85 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success font-mono uppercase bg-success/15 border border-success/20 px-1.5 py-0.5 rounded">
                    {t('command_center.high_confidence' as any) || 'High Confidence'}
                  </span>
                ) : avgEntityConf >= 70 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warn font-mono uppercase bg-warn/15 border border-warn/20 px-1.5 py-0.5 rounded">
                    {t('command_center.medium_confidence' as any) || 'Medium Confidence'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive font-mono uppercase bg-destructive/15 border border-destructive/20 px-1.5 py-0.5 rounded">
                    {t('command_center.low_confidence' as any) || 'Low Confidence'}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Extracted Details */}
        <Card className="border border-border/60 bg-card hover:border-border transition-colors duration-150 rounded-squircle p-4">
          <CardContent className="p-0 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                {t('command_center.extracted_details' as any) || 'Extracted Details'}
              </span>
              <Sparkles className="h-4 w-4 text-info" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                <AnimatedMetric value={entities.length} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">
                {t('command_center.normalized_entities' as any) || 'Normalized case entities'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Dispatched Requests */}
        <Card className="border border-border/60 bg-card hover:border-border transition-colors duration-150 rounded-squircle p-4">
          <CardContent className="p-0 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                {t('command_center.legal_requests' as any) || 'Legal Requests'}
              </span>
              <Mail className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                <AnimatedMetric value={requests.filter(r => r.status === "dispatched" || r.status === "responded").length} />
                <span className="text-muted-foreground text-sm font-normal"> / {requests.length}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">
                {t('command_center.active_requests' as any) || 'Active telecom/bank requests'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Timeline Progress */}
        <Card className="border border-border/60 bg-card hover:border-border transition-colors duration-150 rounded-squircle p-4">
          <CardContent className="p-0 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold">
                {t('command_center.timeline_progress' as any) || 'Timeline Progress'}
              </span>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                <AnimatedMetric value={workflow.completion_percentage} />%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">
                Current stage: {workflow.current_stage}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Spine Indicator */}
      <Card className="border border-border/60 bg-card">
        <CardContent className="pt-6">
          <WorkflowSpine stages={workflow.stages} currentStage={workflow.current_stage} />
        </CardContent>
      </Card>

      {/* Next Best Action Banner */}
      <NextBestAction
        actionType={workflow.next_action_type}
        actionLabel={workflow.next_action_label}
        blockerCodes={workflow.blocker_codes}
        onAction={handleActionExecute}
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Entities Overview */}
          {/* Key Entities Overview */}
          <Card className="border border-border/60 bg-card p-5">
            <EntityPivotPanel
              entities={entities}
              relationships={relationships}
              relatedCases={relatedCases}
              onSync={handleSyncEntities}
            />
          </Card>

          {/* Active Requests & Analytics Insights */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                {t('command_center.insights' as any) || 'Requests & Response Insights'}
              </CardTitle>
              {requests.length > 0 && (
                <Button
                  onClick={() => router.push(`/cases/${caseId}/requests`)}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-accent-strong hover:text-accent-strong/80 gap-1"
                >
                  {t("command_center.manage_requests")} <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requests summary */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                  {t('command_center.dispatched_requests' as any) || 'Dispatched Requests'}
                </h4>
                {requests.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-border/40 rounded-lg">
                    <Mail className="h-6 w-6 text-muted-foreground mx-auto mb-1 opacity-50" />
                    <p className="text-[11px] text-muted-foreground">{t('command_center.no_requests' as any) || 'No requests drafted or dispatched.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2.5 bg-secondary/30 border border-border/30 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate font-heading">{req.provider_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {req.recipient_email}
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Latest Response insight */}
              {responses.length > 0 && (
                <div className="border-t border-border/30 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                    {t("command_center.latest_insight")}
                  </h4>
                  <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs font-semibold font-heading text-success">
                        {t("command_center.ai_correlation_flags")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      &quot;{responses[0].ai_insights.slice(0, 180)}
                      {responses[0].ai_insights.length > 180 ? "..." : ""}&quot;
                    </p>
                    <div className="mt-2 text-right">
                      <Button
                        onClick={() => router.push(`/cases/${caseId}/responses`)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-success hover:bg-success/10 gap-1 font-mono"
                      >
                        {t("command_center.view_full_insights")} <ArrowRight className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="space-y-6">

          {/* Recent Activity Logs */}
          <Card className="border border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                {t('command_center.recent_log' as any) || 'Recent Case Log'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workflow.recent_activity.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">{t("command_center.no_audit_events")}</p>
                </div>
              ) : (
                <div className="relative pl-4 border-l border-border/40 space-y-4">
                  {workflow.recent_activity.map((activity) => (
                    <div key={activity.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background group-hover:scale-125 transition-transform" />
                      
                      <div>
                        <p className="text-xs font-semibold font-heading text-foreground">
                          {activity.action === "case_created" ? (t('command_center.case_created' as any) || 'CASE CREATED') : activity.action.replace(/_/g, " ").toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground font-mono">
                          <span>{activity.actor_name || "System"}</span>
                          <span>•</span>
                          <span>
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
