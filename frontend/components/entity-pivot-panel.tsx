import { interpolate, useLanguage } from "@/lib/language-context";
import React, { useState } from "react";
import {
  Users,
  Phone,
  CreditCard,
  Globe,
  Mail,
  RefreshCw,
  GitCommit,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type {
  CaseEntityOut,
  EntityRelationshipOut,
  RelatedCaseOut,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useEnumLabel } from "@/lib/i18n/enums";
import { OsintEnrichmentPanel } from "@/components/osint-enrichment-panel";

interface EntityPivotPanelProps {
  entities: CaseEntityOut[];
  relationships: EntityRelationshipOut[];
  relatedCases: RelatedCaseOut[];
  onSync: () => Promise<void>;
}

export function EntityPivotPanel({
  entities,
  relationships,
  relatedCases,
  onSync,
}: EntityPivotPanelProps) {
  const { t } = useLanguage();
  const { label: enumLabel } = useEnumLabel();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  // Group entities by type
  const entityGroups = entities.reduce((acc, ent) => {
    if (!acc[ent.entity_type]) {
      acc[ent.entity_type] = [];
    }
    acc[ent.entity_type].push(ent);
    return acc;
  }, {} as Record<string, CaseEntityOut[]>);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "person":
        return <Users className="h-4 w-4 text-info" />;
      case "phone":
        return <Phone className="h-4 w-4 text-success" />;
      case "bank_account":
        return <CreditCard className="h-4 w-4 text-info" />;
      case "ip":
      case "ip_address":
        return <Globe className="h-4 w-4 text-info" />;
      case "email":
        return <Mail className="h-4 w-4 text-info" />;
      default:
        return <Layers className="h-4 w-4 text-warn" />;
    }
  };

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  // Find relationships for selected entity
  const entityRelationships = selectedEntity
    ? relationships.filter(
        (r) =>
          r.source_entity_id === selectedEntity.id ||
          r.target_entity_id === selectedEntity.id
      )
    : [];

  // Find matching related cases for selected entity
  const matchingRelatedCases = selectedEntity
    ? relatedCases.filter((rc) =>
        rc.matches.some(
          (m) =>
            m.entity_type === selectedEntity.entity_type &&
            m.value === selectedEntity.display_value
        )
      )
    : [];

  return (
    // The panel owns its own surfaces because it is rendered directly on the page
    // rather than wrapped in a Card. Left column is the entity index; right column
    // is the intelligence on whichever entity is selected.
    <div className="grid grid-cols-1 gap-6 rounded-squircle border border-border/80 bg-card p-5 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {t("command_center.pivot_panel")}
          </h3>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            {t("command_center.sync_entities")}
          </Button>
        </div>

        <div className="flex max-h-[500px] flex-col gap-4 overflow-y-auto pr-1">
          {Object.entries(entityGroups).map(([type, list]) => (
            <div key={type} className="flex flex-col gap-2">
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {enumLabel("entity.type", type)} · {list.length}
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((ent) => {
                  const isSelected = ent.id === selectedEntityId;
                  const isLowConfidence = ent.confidence < 0.7;

                  return (
                    <button
                      type="button"
                      key={ent.id}
                      onClick={() => setSelectedEntityId(ent.id)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-between gap-2 rounded-squircle-sm border p-3 text-left transition-colors duration-200 ${
                        isSelected
                          ? "border-primary/50 bg-primary/10"
                          : isLowConfidence
                            ? "border-warn/40 bg-warn/[0.04] hover:border-warn/60"
                            : "border-border bg-surface-alt hover:border-border/60"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {getEntityIcon(type)}
                        <span className="truncate font-mono text-xs font-semibold text-foreground">
                          {ent.display_value}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isLowConfidence && (
                          <ShieldAlert
                            className="h-3.5 w-3.5 text-warn"
                            aria-label={t("command_center.low_confidence")}
                          />
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            ent.confidence >= 0.85
                              ? "bg-success/10 text-success"
                              : "bg-warn/10 text-warn"
                          }`}
                        >
                          {Math.round(ent.confidence * 100)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {entities.length === 0 && (
            <div className="rounded-squircle border border-dashed border-border bg-surface-alt/40 px-4 py-8 text-center text-xs text-muted-foreground">
              {t("command_center.no_synced_entities")}
            </div>
          )}
        </div>
      </div>

      {/* Selected Entity Intelligence panel */}
      <div className="flex min-h-[300px] flex-col gap-4 rounded-squircle border border-border bg-surface-alt p-4 lg:col-span-1">
        {selectedEntity ? (
          <>
            <div className="space-y-1 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase font-mono">
                {getEntityIcon(selectedEntity.entity_type)}
                <span>{enumLabel("entity.type", selectedEntity.entity_type)}</span>
              </div>
              <h4 className="text-base font-bold font-mono text-foreground break-all">
                {selectedEntity.display_value}
              </h4>
              {selectedEntity.canonical_value !== selectedEntity.display_value && (
                <div className="text-[10px] font-mono text-muted-foreground break-all">
                  {t("entity.canonical")}: {selectedEntity.canonical_value}
                </div>
              )}
            </div>

            {/* Entity relationships */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase block">
                {t("entity.relationships")} ({entityRelationships.length})
              </span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {entityRelationships.map((r) => {
                  const isSource = r.source_entity_id === selectedEntity.id;
                  const otherId = isSource ? r.target_entity_id : r.source_entity_id;
                  const otherEnt = entities.find((e) => e.id === otherId);

                  if (!otherEnt) return null;

                  return (
                    <div
                      key={r.id}
                      className="rounded-squircle-sm border border-border bg-background p-2 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground capitalize">
                          {enumLabel("entity.type", r.relationship_type)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-foreground text-[11px] min-w-0">
                        {isSource ? (
                          <>
                            <span className="truncate">{t("entity.this_entity")}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate text-foreground">
                              {otherEnt.display_value}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="truncate text-foreground">
                              {otherEnt.display_value}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{t("entity.this_entity")}</span>
                          </>
                        )}
                      </div>
                      {r.evidence_ref?.transaction_id && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          TXN: {r.evidence_ref.transaction_id} | Vol: {r.evidence_ref.amount}
                        </div>
                      )}
                      {r.evidence_ref?.duration_sec && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Call: {r.evidence_ref.duration_sec}s | {r.evidence_ref.timestamp}
                        </div>
                      )}
                    </div>
                  );
                })}

                {entityRelationships.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    {t("entity.no_relationships_mapped")}
                  </div>
                )}
              </div>
            </div>

            {/* Related Cases Cross match */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase block">
                  {t("entity.related_cases")}
                </span>
                  <span className="text-[10px] font-bold bg-warn/10 text-warn border border-warn/20 px-1.5 py-0.5 rounded">
                  {t("entity.possible_match")}
                </span>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {matchingRelatedCases.map((rc) => (
                  <div
                    key={rc.case_id}
                    className="rounded-squircle-sm border border-border bg-background p-2 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-foreground">
                        {rc.case_number}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        {rc.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px] font-medium truncate">
                      {rc.title}
                    </div>
                    <div className="pt-0.5 font-mono text-[10px] text-muted-foreground">
                      {interpolate(t("entity.via_match"), { type: enumLabel("entity.type", selectedEntity.entity_type), value: selectedEntity.display_value })}
                    </div>
                  </div>
                ))}

                {matchingRelatedCases.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    {t("entity.no_shared_cases")}
                  </div>
                )}
              </div>
            </div>

            {/* OSINT Enrichment Module */}
            <div className="pt-4 border-t border-border/60">
              <OsintEnrichmentPanel
                caseId={selectedEntity.case_id}
                entity={selectedEntity}
                onPivotAction={onSync}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <GitCommit className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {t('command_center.select_entity')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
