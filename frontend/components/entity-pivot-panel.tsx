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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Entity Lists Grouped */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold font-heading text-foreground">
              Intelligence Pivot Panel / इंटेलिजेंस पिवट
            </h3>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-primary/40 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            Sync Entities
          </button>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {Object.entries(entityGroups).map(([type, list]) => (
            <div key={type} className="space-y-2">
              <span className="text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-wider block">
                {type.replace("_", " ")}s ({list.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {list.map((ent) => {
                  const isSelected = ent.id === selectedEntityId;
                  const isLowConfidence = ent.confidence < 0.7;

                  return (
                    <div
                      key={ent.id}
                      onClick={() => setSelectedEntityId(ent.id)}
                      className={`p-3 rounded-squircle-sm border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 glow-primary"
                          : isLowConfidence
                          ? "border-warn/40 bg-warn/5 hover:bg-warn/10 text-warn"
                          : "border-border bg-secondary/60 hover:bg-secondary/90 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {getEntityIcon(type)}
                        <span className="font-mono text-xs font-semibold text-foreground truncate">
                          {ent.display_value}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isLowConfidence && (
                          <span title="Low Confidence / कम आत्मविश्वास">
                            <ShieldAlert
                              className="h-3.5 w-3.5 text-warn animate-pulse"
                            />
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-squircle-sm ${
                            ent.confidence >= 0.85
                              ? "bg-success/10 text-success"
                              : ent.confidence >= 0.7
                              ? "bg-warn/10 text-warn"
                              : "bg-warn/25 text-warn font-semibold"
                          }`}
                        >
                          {Math.round(ent.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {entities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs bg-surface-alt/40 rounded-xl border border-dashed border-border">
              No normalized entities synced yet. Trigger sync to build.
            </div>
          )}
        </div>
      </div>

      {/* Selected Entity Intelligence panel */}
      <div className="lg:col-span-1 border border-border rounded-squircle bg-surface-alt p-4 space-y-4 min-h-[300px]">
        {selectedEntity ? (
          <>
            <div className="space-y-1 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase font-mono">
                {getEntityIcon(selectedEntity.entity_type)}
                <span>{selectedEntity.entity_type.replace("_", " ")}</span>
              </div>
              <h4 className="text-base font-bold font-mono text-foreground break-all">
                {selectedEntity.display_value}
              </h4>
              {selectedEntity.canonical_value !== selectedEntity.display_value && (
                <div className="text-[10px] font-mono text-muted-foreground break-all">
                  Canonical: {selectedEntity.canonical_value}
                </div>
              )}
            </div>

            {/* Entity relationships */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase block">
                Relationships / संबंध ({entityRelationships.length})
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
                      className="p-2 rounded bg-surface-alt border border-border text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground capitalize">
                          {r.relationship_type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-foreground text-[11px] min-w-0">
                        {isSource ? (
                          <>
                            <span className="truncate">This</span>
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate text-primary">
                              {otherEnt.display_value}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="truncate text-primary">
                              {otherEnt.display_value}
                            </span>
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">This</span>
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
                    No relationships mapped for this entity.
                  </div>
                )}
              </div>
            </div>

            {/* Related Cases Cross match */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase block">
                  Related Cases / संबंधित मामले
                </span>
                  <span className="text-[10px] font-bold bg-warn/10 text-warn border border-warn/20 px-1.5 py-0.5 rounded">
                  POSSIBLE MATCH
                </span>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {matchingRelatedCases.map((rc) => (
                  <div
                    key={rc.case_id}
                    className="p-2 rounded bg-surface-alt border border-border text-xs space-y-1"
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
                    <div className="text-[10px] text-primary/80 italic font-mono pt-0.5">
                      Via matching {selectedEntity.entity_type} '{selectedEntity.display_value}'
                    </div>
                  </div>
                ))}

                {matchingRelatedCases.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    No other cases share this entity.
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
              Select an entity to view relationships, transaction links, and possible case matches.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
