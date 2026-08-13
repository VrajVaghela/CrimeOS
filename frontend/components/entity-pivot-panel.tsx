import { interpolate, useLanguage } from "@/lib/language-context";
import React, { useState, useEffect } from "react";
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
  Search,
  Calendar,
  MapPin,
  Copy,
  Check,
  Building2,
  Hash,
  Link2,
  Sparkles,
  Filter,
  LayoutGrid,
  List,
  Briefcase,
  Activity,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"unified" | "grouped">("unified");
  const [activeTab, setActiveTab] = useState<"relationships" | "cases" | "osint">("relationships");
  const [copied, setCopied] = useState(false);

  // Auto-select first entity on load or if selected entity no longer exists
  useEffect(() => {
    if (entities.length > 0) {
      const exists = entities.some((e) => e.id === selectedEntityId);
      if (!selectedEntityId || !exists) {
        setSelectedEntityId(entities[0].id);
      }
    } else {
      setSelectedEntityId(null);
    }
  }, [entities, selectedEntityId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEntityIcon = (type: string, className = "h-4 w-4") => {
    const normalizedType = type.toLowerCase();
    switch (normalizedType) {
      case "person":
      case "name":
        return <Users className={`${className} text-info`} />;
      case "phone":
        return <Phone className={`${className} text-success`} />;
      case "bank_account":
      case "account":
      case "upi":
        return <CreditCard className={`${className} text-info`} />;
      case "ip":
      case "ip_address":
      case "url":
        return <Globe className={`${className} text-accent-strong`} />;
      case "email":
        return <Mail className={`${className} text-info`} />;
      case "date":
      case "timestamp":
        return <Calendar className={`${className} text-warn`} />;
      case "location":
      case "address":
        return <MapPin className={`${className} text-danger`} />;
      case "organization":
        return <Building2 className={`${className} text-info`} />;
      case "transaction_id":
      case "imei":
        return <Hash className={`${className} text-muted-foreground`} />;
      default:
        return <Layers className={`${className} text-warn`} />;
    }
  };

  // Filter entities by search and type
  const filteredEntities = entities.filter((ent) => {
    const matchesSearch =
      ent.display_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.canonical_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedTypeFilter === "all" ||
      ent.entity_type.toLowerCase() === selectedTypeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Group filtered entities by type
  const entityGroups = filteredEntities.reduce((acc, ent) => {
    if (!acc[ent.entity_type]) {
      acc[ent.entity_type] = [];
    }
    acc[ent.entity_type].push(ent);
    return acc;
  }, {} as Record<string, CaseEntityOut[]>);

  // Available types for filter pills
  const availableTypes = Array.from(new Set(entities.map((e) => e.entity_type)));

  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  // Map relationship counts per entity
  const relationshipCountMap = relationships.reduce((acc, r) => {
    acc[r.source_entity_id] = (acc[r.source_entity_id] || 0) + 1;
    acc[r.target_entity_id] = (acc[r.target_entity_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

  const renderEntityCard = (ent: CaseEntityOut) => {
    const isSelected = ent.id === selectedEntityId;
    const isLowConfidence = ent.confidence < 0.7;
    const relCount = relationshipCountMap[ent.id] || 0;

    return (
      <button
        type="button"
        key={ent.id}
        onClick={() => setSelectedEntityId(ent.id)}
        aria-pressed={isSelected}
        className={`group relative flex items-center justify-between gap-3 rounded-squircle-sm border p-3 text-left transition-all duration-150 ${
          isSelected
            ? "border-primary/60 bg-secondary/80 text-foreground ring-1 ring-primary/30 shadow-sm"
            : isLowConfidence
            ? "border-warn/40 bg-warn/[0.04] hover:border-warn/60 hover:bg-warn/[0.08]"
            : "border-border/80 bg-surface-alt/70 hover:border-border-hover hover:bg-surface-alt"
        }`}
      >
        {/* Left selection indicator accent line */}
        {isSelected && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary" />
        )}

        <div className="flex min-w-0 items-center gap-2.5 pl-1">
          <div className={`p-2 rounded-squircle-sm shrink-0 ${isSelected ? "bg-primary/15" : "bg-muted/20"}`}>
            {getEntityIcon(ent.entity_type)}
          </div>
          <div className="min-w-0 space-y-0.5">
            <span className="block truncate font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {ent.display_value}
            </span>
            <span className="block font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              {enumLabel("entity.type", ent.entity_type)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {relCount > 0 && (
            <span
              title={`${relCount} relationships`}
              className="flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground border border-border/40"
            >
              <Link2 className="h-2.5 w-2.5 text-primary" />
              {relCount}
            </span>
          )}

          {isLowConfidence && (
            <ShieldAlert
              className="h-3.5 w-3.5 text-warn shrink-0"
              aria-label={t("command_center.low_confidence")}
            />
          )}
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
              ent.confidence >= 0.85
                ? "bg-success/15 text-success border border-success/20"
                : "bg-warn/15 text-warn border border-warn/20"
            }`}
          >
            {Math.round(ent.confidence * 100)}%
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 rounded-squircle border border-border/80 bg-card p-6 sm:p-7 lg:grid-cols-12 items-stretch">
      {/* Left Column Rail: Entity Index (4 cols out of 12 = 1/3 ratio, narrow & crisp) */}
      <div className="flex flex-col gap-5 rounded-squircle border border-border/60 bg-surface-alt/40 p-5 lg:col-span-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-semibold text-foreground">
                {t("command_center.pivot_panel")}
              </h3>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] font-bold text-foreground border border-border/60">
                {entities.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Extracted entities catalog
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            loading={syncing}
            className="shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {t("command_center.sync_entities")}
          </Button>
        </div>

        {/* Controls: Search & Category Filter Pills */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="w-full rounded-squircle-sm border border-border/80 bg-background/80 py-2.5 pl-10 pr-9 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          {availableTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] font-mono font-semibold uppercase text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("all")}
                className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition-colors ${
                  selectedTypeFilter === "all"
                    ? "bg-foreground text-background font-bold shadow-xs"
                    : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
                }`}
              >
                All ({entities.length})
              </button>
              {availableTypes.map((type) => {
                const count = entities.filter((e) => e.entity_type === type).length;
                const isSelected = selectedTypeFilter.toLowerCase() === type.toLowerCase();

                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setSelectedTypeFilter(isSelected ? "all" : type)}
                    className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-foreground text-background font-bold shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
                    }`}
                  >
                    {getEntityIcon(type, "h-3 w-3")}
                    <span>{enumLabel("entity.type", type)}</span>
                    <span className="opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Entity Catalog List Container */}
        <div className="flex max-h-[560px] flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2.5">
            {filteredEntities.map((ent) => renderEntityCard(ent))}
          </div>

          {filteredEntities.length === 0 && entities.length > 0 && (
            <div className="rounded-squircle border border-dashed border-border bg-background/40 px-4 py-8 text-center text-xs text-muted-foreground">
              No entities match "{searchQuery}".
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTypeFilter("all");
                }}
                className="block mx-auto mt-2 text-primary font-semibold hover:underline text-xs"
              >
                Clear filters
              </button>
            </div>
          )}

          {entities.length === 0 && (
            <div className="rounded-squircle border border-dashed border-border bg-background/40 px-4 py-10 text-center text-xs text-muted-foreground space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 animate-pulse" />
              <div className="font-semibold text-foreground">{t("command_center.no_synced_entities")}</div>
              <p className="max-w-xs mx-auto text-muted-foreground text-[11px]">
                Click "Sync Entities" above to trigger entity normalization across complaint data.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Main Column: Intelligence Dossier Workplace (8 cols out of 12 = 2/3 ratio, spacious & main focus) */}
      <div className="flex min-h-[550px] flex-col gap-5 rounded-squircle border border-border/80 bg-surface-alt/90 p-6 sm:p-7 lg:col-span-8">
        {selectedEntity ? (
          <>
            {/* Entity Dossier Header */}
            <div className="space-y-3 pb-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs font-mono tracking-wider font-semibold">
                  <div className="p-2 rounded-squircle-sm bg-primary/10 text-primary border border-primary/20">
                    {getEntityIcon(selectedEntity.entity_type, "h-4.5 w-4.5")}
                  </div>
                  <span className="uppercase text-foreground font-bold tracking-wider">{enumLabel("entity.type", selectedEntity.entity_type)}</span>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold ${
                    selectedEntity.confidence >= 0.85
                      ? "bg-success/15 text-success border border-success/30"
                      : "bg-warn/15 text-warn border border-warn/30"
                  }`}
                >
                  {Math.round(selectedEntity.confidence * 100)}% Confidence Match
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 pt-1">
                <h4 className="text-xl font-bold font-mono text-foreground break-all leading-tight">
                  {selectedEntity.display_value}
                </h4>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleCopy(selectedEntity.display_value)}
                  title="Copy entity value"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {selectedEntity.canonical_value !== selectedEntity.display_value && (
                <div className="text-xs font-mono text-muted-foreground break-all bg-background/60 p-2.5 rounded-squircle-sm border border-border/40">
                  <span className="font-semibold text-muted-foreground">{t("entity.canonical")}:</span>{" "}
                  <span className="text-foreground">{selectedEntity.canonical_value}</span>
                </div>
              )}
            </div>

            {/* Segmented Intelligence Dossier Tabs */}
            <div className="flex items-center rounded-squircle-sm border border-border/70 bg-background/80 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("relationships")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono font-medium rounded-squircle-sm transition-all ${
                  activeTab === "relationships"
                    ? "bg-secondary text-foreground font-bold shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link2 className="h-3.5 w-3.5 text-primary" />
                <span>Relationships</span>
                <span className="rounded bg-muted/20 px-1.5 py-0.2 text-[10px]">
                  {entityRelationships.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("cases")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono font-medium rounded-squircle-sm transition-all ${
                  activeTab === "cases"
                    ? "bg-secondary text-foreground font-bold shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5 text-warn" />
                <span>Related Cases</span>
                <span className="rounded bg-muted/20 px-1.5 py-0.2 text-[10px]">
                  {matchingRelatedCases.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("osint")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono font-medium rounded-squircle-sm transition-all ${
                  activeTab === "osint"
                    ? "bg-secondary text-foreground font-bold shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-info" />
                <span>OSINT Scan</span>
              </button>
            </div>

            {/* Tab 1: Graph Relationships */}
            {activeTab === "relationships" && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider block">
                    {t("entity.relationships")} ({entityRelationships.length})
                  </span>
                  {entityRelationships.length > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Click node to pivot target
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5">
                  {entityRelationships.map((r) => {
                    const isSource = r.source_entity_id === selectedEntity.id;
                    const otherId = isSource ? r.target_entity_id : r.source_entity_id;
                    const otherEnt = entities.find((e) => e.id === otherId);

                    if (!otherEnt) return null;

                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setSelectedEntityId(otherEnt.id)}
                        className="w-full text-left rounded-squircle-sm border border-border/80 bg-background/90 p-4 text-xs flex flex-col gap-2.5 hover:border-primary/50 hover:bg-background transition-all group shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-0.5 rounded border border-border/60">
                            {enumLabel("entity.type", r.relationship_type)}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                            {Math.round(r.confidence * 100)}% match confidence
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-foreground text-xs min-w-0 pt-0.5">
                          {isSource ? (
                            <>
                              <span className="truncate text-muted-foreground">{t("entity.this_entity")}</span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-primary group-hover:translate-x-1 transition-transform" />
                              <span className="truncate text-foreground font-bold group-hover:text-primary transition-colors text-sm">
                                {otherEnt.display_value}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="truncate text-foreground font-bold group-hover:text-primary transition-colors text-sm">
                                {otherEnt.display_value}
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-primary group-hover:translate-x-1 transition-transform" />
                              <span className="truncate text-muted-foreground">{t("entity.this_entity")}</span>
                            </>
                          )}
                        </div>

                        {r.evidence_ref?.transaction_id && (
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5 bg-muted/20 p-2 rounded-squircle-sm border border-border/40">
                            TXN ID: <span className="text-foreground font-semibold">{r.evidence_ref.transaction_id}</span> | Vol: <span className="text-success font-semibold">₹{r.evidence_ref.amount}</span>
                          </div>
                        )}
                        {r.evidence_ref?.duration_sec && (
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5 bg-muted/20 p-2 rounded-squircle-sm border border-border/40">
                            Call Duration: <span className="text-foreground font-semibold">{r.evidence_ref.duration_sec}s</span> | {r.evidence_ref.timestamp}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {entityRelationships.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-xs rounded-squircle-sm border border-dashed border-border bg-background/40 space-y-2">
                      <Link2 className="h-8 w-8 mx-auto text-muted-foreground/30" />
                      <div className="font-semibold text-foreground">{t("entity.no_relationships_mapped")}</div>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                        No co-occurrence or transaction links found for this entity.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Related Cases */}
            {activeTab === "cases" && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider block">
                    {t("entity.related_cases")} ({matchingRelatedCases.length})
                  </span>
                  <span className="text-[11px] font-bold bg-warn/15 text-warn border border-warn/30 px-2.5 py-0.5 rounded-full font-mono">
                    {t("entity.possible_match")}
                  </span>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5">
                  {matchingRelatedCases.map((rc) => (
                    <div
                      key={rc.case_id}
                      className="rounded-squircle-sm border border-border/80 bg-background/90 p-4 text-xs space-y-2 hover:border-border-hover transition-colors shadow-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-foreground flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-warn" />
                          {rc.case_number}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                          rc.status === "active" ? "bg-success/15 text-success border border-success/30" : "bg-muted/20 text-muted-foreground border border-border/40"
                        }`}>
                          {rc.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs font-medium truncate">
                        {rc.title}
                      </div>
                      <div className="pt-1.5 font-mono text-[11px] text-muted-foreground border-t border-border/30">
                        {interpolate(t("entity.via_match"), {
                          type: enumLabel("entity.type", selectedEntity.entity_type),
                          value: selectedEntity.display_value,
                        })}
                      </div>
                    </div>
                  ))}

                  {matchingRelatedCases.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-xs rounded-squircle-sm border border-dashed border-border bg-background/40 space-y-2">
                      <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/30" />
                      <div className="font-semibold text-foreground">{t("entity.no_shared_cases")}</div>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                        No cross-case matches discovered for {selectedEntity.display_value}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: OSINT & Digital Footprint */}
            {activeTab === "osint" && (
              <div className="flex-1 overflow-y-auto max-h-[380px] pr-1.5 p-1">
                <OsintEnrichmentPanel
                  caseId={selectedEntity.case_id}
                  entity={selectedEntity}
                  onPivotAction={onSync}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
            <GitCommit className="h-10 w-10 text-muted-foreground/30 mb-1 animate-pulse" />
            <div className="font-semibold text-foreground text-sm">No Entity Selected</div>
            <p className="text-xs text-muted-foreground max-w-xs">
              {t("command_center.select_entity")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


