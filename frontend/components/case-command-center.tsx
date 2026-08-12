"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, ArrowRight, Mail, Sparkles } from "lucide-react";

import { AiContentCard } from "@/components/ai-content-card";
import { EntityPivotPanel } from "@/components/entity-pivot-panel";
import { NextBestAction } from "@/components/next-best-action";
import { StatusBadge } from "@/components/status-badge";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import { WorkflowSpine } from "@/components/workflow-spine";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useEnumLabel } from "@/lib/i18n/enums";
import { useFormatters } from "@/lib/format";
import { useLanguage } from "@/lib/language-context";
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

/**
 * The case overview.
 *
 * Ordered by what an officer needs first: the action to take, then where the case
 * sits in the workflow, then the numbers, then the detail. It deliberately does
 * not restate the case number, title, or crime type — the case header directly
 * above already carries all three, and repeating them in a hero card was the
 * largest block of duplicated screen on this route.
 */

/** A labelled fact in the right-hand case column. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

interface CaseCommandCenterProps {
  caseId: string;
}

export function CaseCommandCenter({ caseId }: CaseCommandCenterProps) {
  const { t } = useLanguage();
  const { formatDateTime, formatTime } = useFormatters();
  const { label: enumLabel } = useEnumLabel();
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
      setError(e instanceof ApiError ? e.message : t("command_center.load_error"));
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
      setError(e instanceof ApiError ? e.message : t("command_center.sync_error"));
    }
  };

  useEffect(() => {
    if (caseId) void loadData();
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
    if (target) router.push(`/cases/${caseId}/${target}`);
  };

  const uniqueComplainants = Array.from(
    new Set(
      caseData?.complaints?.flatMap((c) =>
        c.entities.filter((e) => e.entity_type.toLowerCase() === "person").map((e) => e.value),
      ) ?? [],
    ),
  );

  /** Mean extraction confidence, preferring synced entities over raw complaint output. */
  const avgEntityConf = (() => {
    if (entities.length > 0) {
      const sum = entities.reduce((acc, curr) => acc + curr.confidence, 0);
      return Math.round((sum / entities.length) * 100);
    }
    const allExtracted = caseData?.complaints?.flatMap((c) => c.entities) ?? [];
    if (allExtracted.length > 0) {
      const sum = allExtracted.reduce((acc, curr) => acc + curr.confidence, 0);
      return Math.round((sum / allExtracted.length) * 100);
    }
    return 0;
  })();

  const confidenceTone =
    avgEntityConf >= 85 ? "success" : avgEntityConf >= 70 ? "attention" : "critical";
  const confidenceHint =
    avgEntityConf >= 85
      ? t("command_center.high_confidence")
      : avgEntityConf >= 70
        ? t("command_center.medium_confidence")
        : t("command_center.low_confidence");

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-squircle" />
        <Skeleton className="h-32 w-full rounded-squircle" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-squircle lg:col-span-2" />
          <Skeleton className="h-64 rounded-squircle" />
        </div>
      </div>
    );
  }

  if (error || !commandData) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t("command_center.load_error")}
        description={error ?? undefined}
        action={{ label: t("common.retry"), onClick: () => void loadData() }}
      />
    );
  }

  const { workflow } = commandData;
  const dispatchedCount = requests.filter(
    (r) => r.status === "dispatched" || r.status === "responded",
  ).length;

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      {/* What to do next leads the page. Everything below explains why. */}
      <NextBestAction
        actionType={workflow.next_action_type}
        actionLabel={workflow.next_action_label}
        blockerCodes={workflow.blocker_codes}
        onAction={handleActionExecute}
      />

      <section className="rounded-squircle border border-border/80 bg-card px-5 pb-2 pt-5">
        <div className="mb-1 flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-sm font-semibold">
            {t("command_center.workflow_heading")}
          </h2>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {workflow.completion_percentage}%
          </span>
        </div>
        <WorkflowSpine stages={workflow.stages} currentStage={workflow.current_stage} />
      </section>

      <MetricStrip columns={3}>
        <Metric
          label={t("command_center.case_confidence")}
          value={`${avgEntityConf}%`}
          tone={confidenceTone}
          hint={confidenceHint}
        />
        <Metric
          label={t("command_center.extracted_details")}
          value={entities.length}
          hint={t("command_center.normalized_entities")}
        />
        <Metric
          label={t("command_center.legal_requests")}
          value={dispatchedCount}
          suffix={`/ ${requests.length}`}
          hint={t("command_center.active_requests")}
        />
      </MetricStrip>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AiContentCard title={t("command_center.ai_summary")}>
            <div className="text-sm leading-relaxed text-foreground">
              {summaries.length > 0 ? (
                <TranslatedTextBlock content={summaries[0].content} />
              ) : (
                <p className="text-muted-foreground">{t("command_center.ai_summary_empty")}</p>
              )}
            </div>
          </AiContentCard>

          {/* The pivot panel owns its own surfaces; wrapping it in a Card would
              nest a card inside a card and double the inset padding. */}
          <EntityPivotPanel
            entities={entities}
            relationships={relationships}
            relatedCases={relatedCases}
            onSync={handleSyncEntities}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("command_center.insights")}</CardTitle>
              {requests.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/cases/${caseId}/requests`)}
                  className="-mr-2 shrink-0"
                >
                  {t("command_center.manage_requests")}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>

            {requests.length === 0 ? (
              <EmptyState
                icon={Mail}
                title={t("command_center.no_requests")}
                description={t("command_center.no_requests_sub")}
                className="py-8"
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {requests.slice(0, 3).map((req) => (
                  <li
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-squircle-sm border border-border/60 bg-surface-alt px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {req.provider_name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {req.recipient_email}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </li>
                ))}
              </ul>
            )}

            {responses.length > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-info" />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-info">
                    {t("command_center.ai_correlation_flags")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-secondary-foreground">
                  {responses[0].ai_insights.slice(0, 220)}
                  {responses[0].ai_insights.length > 220 ? "…" : ""}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/cases/${caseId}/responses`)}
                  className="-ml-3 mt-1.5"
                >
                  {t("command_center.view_full_insights")}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <CardTitle className="text-base">{t("command_center.case_facts")}</CardTitle>

            <Fact label={t("command_center.case_status")}>
              <StatusBadge status={caseData?.status ?? "open"} />
            </Fact>

            <Fact label={t("command_center.registered_date")}>
              <span className="font-mono text-xs">
                {caseData?.created_at
                  ? formatDateTime(caseData.created_at)
                  : t("common.not_available")}
              </span>
            </Fact>

            <Fact label={t("command_center.officer_in_charge")}>
              {t("command_center.io_role")}
            </Fact>

            {uniqueComplainants.length > 0 && (
              <Fact label={t("command_center.complainants")}>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueComplainants.map((name) => (
                    <span
                      key={name}
                      className="rounded-squircle-sm border border-border/60 bg-surface-alt px-2 py-0.5 font-mono text-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </Fact>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("command_center.recent_log")}</CardTitle>
            </CardHeader>

            {workflow.recent_activity.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                {t("command_center.no_audit_events")}
              </p>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
                {workflow.recent_activity.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground ring-4 ring-card"
                    />
                    <p className="text-sm font-medium text-foreground">
                      {enumLabel("audit.actions", activity.action)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {activity.actor_name || t("command_center.system_actor")}
                      <span className="mx-1.5 text-muted-foreground/40">/</span>
                      {formatTime(activity.timestamp)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="self-start"
          >
            <Activity className="h-3.5 w-3.5" />
            {t("command_center.refresh_control")}
          </Button>
        </div>
      </div>
    </div>
  );
}
