"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Fingerprint,
  Globe,
  Layers,
  Mail,
  MousePointerClick,
  Phone,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  OsintEnrichmentPanel,
  isOsintSupported,
} from "@/components/osint-enrichment-panel";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  getCaseEntities,
  getEntityRelationships,
  getRelatedCases,
  syncEntities,
} from "@/lib/api";
import { useFormatters } from "@/lib/format";
import { useEnumLabel } from "@/lib/i18n/enums";
import { interpolate, useLanguage } from "@/lib/language-context";
import type {
  CaseEntityOut,
  EntityRelationshipOut,
  RelatedCaseOut,
} from "@/lib/types";

/**
 * OSINT & entity intelligence — a section of the case workspace in its own
 * right, alongside Ingestion, Path, and Responses.
 *
 * It used to be a collapsible panel bolted to the bottom of the case overview,
 * with the OSINT report crammed into the narrow third column beside the entity
 * list. Enrichment is a distinct piece of investigative work with its own
 * actions and its own reading order, so it gets the standard master-detail
 * shape: identifiers in a 4-column rail, everything known about the selected
 * one in the 8-column pane.
 */

const ENTITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  person: Users,
  phone: Phone,
  bank_account: CreditCard,
  account: CreditCard,
  ip: Globe,
  ip_address: Globe,
  url: Globe,
  email: Mail,
};

function EntityIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ENTITY_ICON[type.toLowerCase()] ?? Layers;
  return <Icon className={className ?? "h-3.5 w-3.5 shrink-0 text-muted-foreground"} />;
}

export default function OsintPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t } = useLanguage();
  const { label: enumLabel } = useEnumLabel();
  const { formatDate } = useFormatters();

  const [entities, setEntities] = useState<CaseEntityOut[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationshipOut[]>([]);
  const [relatedCases, setRelatedCases] = useState<RelatedCaseOut[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Loads the identifier set and keeps the current selection if it survived. */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ents, rels, rcases] = await Promise.all([
        getCaseEntities(caseId),
        getEntityRelationships(caseId),
        getRelatedCases(caseId),
      ]);
      setEntities(ents);
      setRelationships(rels);
      setRelatedCases(rcases);
      setSelectedEntityId((prev) => {
        if (prev && ents.some((e) => e.id === prev)) return prev;
        // A scannable identifier is the one an officer came here to work on, so
        // it is preselected over whatever the sync happened to return first.
        return (ents.find((e) => isOsintSupported(e.entity_type)) ?? ents[0])?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("osint.load_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) void load();
  }, [caseId]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await syncEntities(caseId);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("osint.sync_error"));
    } finally {
      setSyncing(false);
    }
  }

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) ?? null;

  const entityRelationships = selectedEntity
    ? relationships.filter(
        (r) =>
          r.source_entity_id === selectedEntity.id ||
          r.target_entity_id === selectedEntity.id,
      )
    : [];

  const matchingRelatedCases = selectedEntity
    ? relatedCases.filter((rc) =>
        rc.matches.some(
          (m) =>
            m.entity_type === selectedEntity.entity_type &&
            m.value === selectedEntity.display_value,
        ),
      )
    : [];

  // Grouped by type, scannable types first: the rail's job is to get an officer
  // to an identifier OSINT can actually act on.
  const groups = Object.entries(
    entities.reduce<Record<string, CaseEntityOut[]>>((acc, ent) => {
      (acc[ent.entity_type] ??= []).push(ent);
      return acc;
    }, {}),
  ).sort(([a], [b]) => {
    const byScannable = Number(isOsintSupported(b)) - Number(isOsintSupported(a));
    return byScannable !== 0 ? byScannable : a.localeCompare(b);
  });

  const scannableCount = entities.filter((e) => isOsintSupported(e.entity_type)).length;

  const syncAction = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void handleSync()}
      disabled={syncing}
      loading={syncing}
      id="sync-entities-btn"
    >
      {!syncing && <RefreshCw className="h-3.5 w-3.5" />}
      {t("osint.sync_entities")}
    </Button>
  );

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <PageHeader
        level="section"
        title={t("osint.section_title")}
        description={t("osint.section_subtitle")}
        actions={syncAction}
      />

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-squircle lg:col-span-4" />
          <div className="flex flex-col gap-6 lg:col-span-8">
            <Skeleton className="h-28 rounded-squircle" />
            <Skeleton className="h-72 rounded-squircle" />
          </div>
        </div>
      ) : entities.length === 0 ? (
        <EmptyState
          icon={Fingerprint}
          title={t("osint.no_entities")}
          description={t("osint.no_entities_sub")}
          action={{
            label: t("osint.sync_entities"),
            onClick: () => void handleSync(),
            icon: RefreshCw,
          }}
        />
      ) : (
        <>
          <MetricStrip columns={3}>
            <Metric
              label={t("osint.metric_identifiers")}
              value={entities.length}
              hint={t("osint.metric_identifiers_hint")}
            />
            <Metric
              label={t("osint.scannable")}
              value={scannableCount}
              suffix={`/ ${entities.length}`}
              hint={t("osint.metric_scannable_hint")}
            />
            <Metric
              label={t("osint.metric_cross_case")}
              value={relatedCases.length}
              tone={relatedCases.length > 0 ? "attention" : "default"}
              hint={t("osint.metric_cross_case_hint")}
            />
          </MetricStrip>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Identifier rail */}
            <div className="flex flex-col gap-4 lg:col-span-4">
              <h3 className="flex items-center gap-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Fingerprint className="h-3.5 w-3.5" />
                {t("osint.entity_index")}
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                  {entities.length}
                </Badge>
              </h3>

              {groups.map(([type, list]) => (
                <div key={type} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {enumLabel("entity.type", type)} · {list.length}
                    </span>
                    {isOsintSupported(type) ? (
                      <Badge variant="outline" className="rounded-sm text-[10px]">
                        {t("osint.scannable")}
                      </Badge>
                    ) : null}
                  </div>

                  <ul className="flex flex-col gap-2">
                    {list.map((ent) => {
                      const isSelected = ent.id === selectedEntityId;
                      const isLowConfidence = ent.confidence < 0.7;

                      return (
                        <li key={ent.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedEntityId(ent.id)}
                            aria-current={isSelected ? "true" : undefined}
                            className={`flex w-full items-center justify-between gap-2 rounded-squircle-sm border px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                              isSelected
                                ? "border-primary/50 bg-primary/10"
                                : isLowConfidence
                                  ? "border-warn/40 bg-warn/[0.04] hover:border-warn/60"
                                  : "border-border bg-card hover:border-border/60"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <EntityIcon type={type} />
                              <span className="truncate font-mono text-xs font-medium text-foreground">
                                {ent.display_value}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {isLowConfidence && (
                                <ShieldAlert
                                  className="h-3.5 w-3.5 text-warn"
                                  aria-label={t("command_center.low_confidence")}
                                />
                              )}
                              <span
                                className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                  ent.confidence >= 0.85
                                    ? "bg-success/10 text-success"
                                    : "bg-warn/10 text-warn"
                                }`}
                              >
                                {Math.round(ent.confidence * 100)}%
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Selected identifier */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              {selectedEntity ? (
                <>
                  <Card className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          <EntityIcon type={selectedEntity.entity_type} />
                          {enumLabel("entity.type", selectedEntity.entity_type)}
                        </div>
                        <h3 className="mt-1 break-all font-mono text-lg font-bold text-foreground">
                          {selectedEntity.display_value}
                        </h3>
                        {selectedEntity.canonical_value !== selectedEntity.display_value ? (
                          <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                            {t("entity.canonical")}: {selectedEntity.canonical_value}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={selectedEntity.status} />
                        <Badge
                          variant={selectedEntity.confidence >= 0.85 ? "success" : "warning"}
                          className="rounded-squircle-sm font-mono text-[10px] font-semibold"
                        >
                          {Math.round(selectedEntity.confidence * 100)}%{" "}
                          {t("common.confidence")}
                        </Badge>
                      </div>
                    </div>

                    <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-3 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <dt>{t("osint.first_seen")}:</dt>
                        <dd className="text-foreground">
                          {formatDate(selectedEntity.first_seen_at)}
                        </dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt>{t("osint.last_seen")}:</dt>
                        <dd className="text-foreground">
                          {formatDate(selectedEntity.last_seen_at)}
                        </dd>
                      </div>
                    </dl>
                  </Card>

                  <OsintEnrichmentPanel
                    caseId={caseId}
                    entity={selectedEntity}
                    onPivotAction={load}
                  />

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {t("entity.relationships")}
                        </CardTitle>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {entityRelationships.length}
                        </Badge>
                      </CardHeader>

                      {entityRelationships.length === 0 ? (
                        <p className="rounded-squircle-sm border border-dashed border-border bg-surface-alt/40 px-4 py-6 text-center text-xs text-muted-foreground">
                          {t("entity.no_relationships_mapped")}
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {entityRelationships.map((r) => {
                            const isSource = r.source_entity_id === selectedEntity.id;
                            const otherId = isSource
                              ? r.target_entity_id
                              : r.source_entity_id;
                            const otherEnt = entities.find((e) => e.id === otherId);
                            if (!otherEnt) return null;

                            return (
                              <li
                                key={r.id}
                                className="flex flex-col gap-1 rounded-squircle-sm border border-border bg-surface-alt p-3 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-muted-foreground">
                                    {enumLabel("entity.type", r.relationship_type)}
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {Math.round(r.confidence * 100)}%
                                  </span>
                                </div>

                                <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-foreground">
                                  {isSource ? (
                                    <>
                                      <span className="truncate text-muted-foreground">
                                        {t("entity.this_entity")}
                                      </span>
                                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                      <span className="truncate">
                                        {otherEnt.display_value}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="truncate">
                                        {otherEnt.display_value}
                                      </span>
                                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                      <span className="truncate text-muted-foreground">
                                        {t("entity.this_entity")}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {r.evidence_ref?.transaction_id ? (
                                  <p className="font-mono text-[10px] text-muted-foreground">
                                    {t("entity.transaction")}: {r.evidence_ref.transaction_id}
                                    <span className="mx-1.5 text-muted-foreground/40">/</span>
                                    {t("entity.amount_label")}: {r.evidence_ref.amount}
                                  </p>
                                ) : null}

                                {r.evidence_ref?.duration_sec ? (
                                  <p className="font-mono text-[10px] text-muted-foreground">
                                    {t("entity.call_duration")}: {r.evidence_ref.duration_sec}s
                                    <span className="mx-1.5 text-muted-foreground/40">/</span>
                                    {r.evidence_ref.timestamp}
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {t("entity.related_cases")}
                        </CardTitle>
                        {matchingRelatedCases.length > 0 ? (
                          <Badge variant="warning" className="font-mono text-[10px] font-semibold">
                            {t("entity.possible_match")}
                          </Badge>
                        ) : null}
                      </CardHeader>

                      {matchingRelatedCases.length === 0 ? (
                        <p className="rounded-squircle-sm border border-dashed border-border bg-surface-alt/40 px-4 py-6 text-center text-xs text-muted-foreground">
                          {t("entity.no_shared_cases")}
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {matchingRelatedCases.map((rc) => (
                            <li key={rc.case_id}>
                              <Link
                                href={`/cases/${rc.case_id}`}
                                className="flex flex-col gap-1 rounded-squircle-sm border border-border bg-surface-alt p-3 text-xs transition-colors duration-200 hover:border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              >
                                <span className="flex items-center justify-between gap-2 font-mono text-[11px]">
                                  <span className="truncate font-bold text-foreground">
                                    {rc.case_number}
                                  </span>
                                  <StatusBadge status={rc.status} />
                                </span>
                                <span className="truncate font-medium text-muted-foreground">
                                  {rc.title}
                                </span>
                                <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                                  {interpolate(t("entity.via_match"), {
                                    type: enumLabel(
                                      "entity.type",
                                      selectedEntity.entity_type,
                                    ),
                                    value: selectedEntity.display_value,
                                  })}
                                  <ArrowRight className="h-3 w-3 shrink-0" />
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={MousePointerClick}
                  title={t("osint.select_entity_title")}
                  description={t("osint.select_entity_sub")}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
