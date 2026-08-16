"use client";

import { useState, useMemo } from "react";
import {
  Search,
  MapPin,
  FileText,
  User,
  Activity,
  Calendar,
  X,
  ChevronRight,
} from "lucide-react";
import {
  REPEAT_OFFENDERS_DATA,
  type RiskLevel,
  type OffenderProfile,
} from "@/lib/repeatOffendersData";
import { useLanguage } from "@/lib/language-context";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function RepeatOffendersPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("ALL");
  const [selectedOffenderId, setSelectedOffenderId] = useState<string>(
    REPEAT_OFFENDERS_DATA[0]?.id || ""
  );

  // Summary statistics across entire dataset
  const totalProfiles = REPEAT_OFFENDERS_DATA.length;
  const criticalCount = useMemo(
    () => REPEAT_OFFENDERS_DATA.filter((o) => o.riskLevel === "CRITICAL").length,
    []
  );
  const highCount = useMemo(
    () => REPEAT_OFFENDERS_DATA.filter((o) => o.riskLevel === "HIGH").length,
    []
  );
  const avgRecidivism = useMemo(() => {
    if (totalProfiles === 0) return 0;
    const sum = REPEAT_OFFENDERS_DATA.reduce((acc, o) => acc + o.recidivismScore, 0);
    return sum / totalProfiles;
  }, [totalProfiles]);

  // Filter offenders based on search query and risk level dropdown
  const filteredOffenders = useMemo(() => {
    return REPEAT_OFFENDERS_DATA.filter((offender) => {
      // Risk filter
      if (selectedRiskFilter !== "ALL" && offender.riskLevel !== selectedRiskFilter) {
        return false;
      }
      // Search query filter (matches name, alias, location, or any offense in timeline)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = offender.name.toLowerCase().includes(query);
        const matchesAlias = offender.alias.toLowerCase().includes(query);
        const matchesLocation = offender.location.toLowerCase().includes(query);
        const matchesOffense = offender.crimeTimeline.some((ct) =>
          ct.offense.toLowerCase().includes(query)
        );
        return matchesName || matchesAlias || matchesLocation || matchesOffense;
      }
      return true;
    });
  }, [selectedRiskFilter, searchQuery]);

  // Active selected offender
  const activeOffender = useMemo(() => {
    const found = filteredOffenders.find((o) => o.id === selectedOffenderId);
    if (found) return found;
    return filteredOffenders[0] || null;
  }, [filteredOffenders, selectedOffenderId]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedRiskFilter("ALL");
  };

  const isFiltered = searchQuery.trim() !== "" || selectedRiskFilter !== "ALL";

  return (
    <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl animate-fade-up flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          title={t("repeat_offenders.title")}
          description={t("repeat_offenders.subtitle")}
          actions={
            isFiltered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t("repeat_offenders.reset_filters")}
              </Button>
            ) : null
          }
        />

        {/* Tactical Overview Metric Strip */}
        <MetricStrip columns={4}>
          <Metric
            label={t("repeat_offenders.stat_total")}
            value={totalProfiles}
            tone="default"
            hint="Surveillance registry"
          />
          <Metric
            label={t("repeat_offenders.stat_critical")}
            value={criticalCount}
            tone="critical"
            hint="Immediate surveillance"
          />
          <Metric
            label={t("repeat_offenders.stat_high")}
            value={highCount}
            tone="attention"
            hint="Pattern monitoring"
          />
          <Metric
            label={t("repeat_offenders.stat_avg_recidivism")}
            value={avgRecidivism.toFixed(1)}
            suffix="/ 100"
            tone="default"
            hint="Cohort risk index"
          />
        </MetricStrip>

        {/* Main Workspace: Master-Detail Grid (8 cols table vs 4 cols inspector) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
          {/* Left Column: Offender Registry (~66% on desktop: lg:col-span-8) */}
          <div className="lg:col-span-8 flex flex-col rounded-squircle border border-border bg-card overflow-hidden">
            {/* Toolbar: Search + Risk Filters */}
            <div className="border-b border-border bg-card/60 p-4 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-sm font-semibold text-foreground">
                    {t("repeat_offenders.registry_title")}
                  </h2>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {filteredOffenders.length}
                  </Badge>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {isFiltered
                    ? `${filteredOffenders.length} of ${totalProfiles} records`
                    : `${totalProfiles} total records`}
                </span>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("repeat_offenders.search_placeholder")}
                    className="h-8 pl-8 text-xs bg-surface-alt border-border rounded-squircle-sm"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none rounded-squircle-sm"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>

                {/* Risk Filter Buttons */}
                <div
                  role="group"
                  aria-label={t("repeat_offenders.filter_all")}
                  className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0"
                >
                  {(
                    [
                      { key: "ALL", label: "All" },
                      { key: "CRITICAL", label: "Critical" },
                      { key: "HIGH", label: "High" },
                      { key: "MEDIUM", label: "Med" },
                      { key: "LOW", label: "Low" },
                    ] as const
                  ).map((rf) => {
                    const isSelected = selectedRiskFilter === rf.key;
                    return (
                      <button
                        key={rf.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedRiskFilter(rf.key)}
                        className={cn(
                          "h-8 px-2.5 rounded-squircle-sm text-xs font-mono transition-colors shrink-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none",
                          isSelected
                            ? "bg-surface-elevated text-foreground border border-border font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-alt border border-transparent"
                        )}
                      >
                        {rf.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Registry Table List */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              {filteredOffenders.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={User}
                    title={t("repeat_offenders.no_results_title")}
                    description={t("repeat_offenders.no_results_desc")}
                    action={{
                      label: t("repeat_offenders.reset_filters"),
                      onClick: handleResetFilters,
                    }}
                  />
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-card border-b border-border font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold min-w-[140px]">Offender</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Age / Sex</th>
                      <th className="px-4 py-3 font-semibold min-w-[140px]">Recidivism</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Risk</th>
                      <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">Cases</th>
                      <th className="px-3 py-3 font-semibold text-right w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredOffenders.map((offender) => {
                      const isSelected = activeOffender?.id === offender.id;
                      return (
                        <tr
                          key={offender.id}
                          onClick={() => setSelectedOffenderId(offender.id)}
                          className={cn(
                            "cursor-pointer transition-colors duration-150 group",
                            isSelected
                              ? "bg-primary/[0.08] hover:bg-primary/[0.10]"
                              : "hover:bg-surface-alt"
                          )}
                        >
                          {/* Name & Alias */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground text-xs leading-snug">
                                {offender.name}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {offender.alias}
                              </span>
                            </div>
                          </td>

                          {/* Demographics */}
                          <td className="px-3 py-3 font-mono text-muted-foreground whitespace-nowrap">
                            {offender.age}y · {offender.gender[0]}
                          </td>

                          {/* Recidivism Score & Meter */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-16 sm:w-20 lg:w-24 shrink-0 overflow-hidden rounded-full bg-background border border-border">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    getRecidivismBarColor(offender.recidivismScore)
                                  )}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, offender.recidivismScore)
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                                {offender.recidivismScore.toFixed(1)}
                              </span>
                            </div>
                          </td>

                          {/* Risk Badge */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <RiskBadge level={offender.riskLevel} />
                          </td>

                          {/* Total Cases */}
                          <td className="px-3 py-3 text-right font-mono font-medium text-foreground tabular-nums whitespace-nowrap">
                            {offender.totalCases}
                          </td>

                          {/* Selection indicator */}
                          <td className="px-3 py-3 text-right">
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 transition-transform inline-block",
                                isSelected
                                  ? "text-primary translate-x-0.5"
                                  : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              )}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Behavioral Profile Inspector (~33% on desktop: lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col rounded-squircle border border-border bg-card overflow-hidden">
            {/* Inspector Header Bar */}
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-3.5 shrink-0">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                {t("repeat_offenders.profile_title")}
              </h2>
              {activeOffender ? (
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  ID: {activeOffender.id}
                </span>
              ) : null}
            </div>

            {activeOffender ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar min-h-0">
                {/* Profile Identity Card */}
                <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {activeOffender.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 font-mono text-xs text-muted-foreground">
                      <span>{activeOffender.alias}</span>
                      <span>·</span>
                      <span>{activeOffender.age} yrs</span>
                      <span>·</span>
                      <span>{activeOffender.gender}</span>
                    </div>
                  </div>
                  <RiskBadge level={activeOffender.riskLevel} />
                </div>

                {/* Score & Volume Metrics Strip */}
                <MetricStrip columns={2}>
                  <Metric
                    label={t("repeat_offenders.recidivism_score")}
                    value={activeOffender.recidivismScore.toFixed(1)}
                    suffix="/ 100"
                    tone={
                      activeOffender.riskLevel === "CRITICAL"
                        ? "critical"
                        : activeOffender.riskLevel === "HIGH"
                          ? "attention"
                          : "default"
                    }
                  />
                  <Metric
                    label={t("repeat_offenders.total_cases")}
                    value={activeOffender.totalCases}
                    tone="default"
                    hint="Recorded FIR incidents"
                  />
                </MetricStrip>

                {/* Active Sector / Location Card */}
                <div className="flex items-center gap-3 rounded-squircle-sm border border-border bg-surface-alt p-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-squircle-sm border border-border bg-card shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("repeat_offenders.active_sector")}
                    </p>
                    <p className="font-semibold text-xs text-foreground truncate mt-0.5">
                      {activeOffender.location}
                    </p>
                  </div>
                </div>

                {/* Crime Timeline Activity Section */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-info" />
                      <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
                        {t("repeat_offenders.crime_timeline")}
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {activeOffender.crimeTimeline.length} offenses
                    </span>
                  </div>

                  {/* Vertical Timeline Rail */}
                  <div className="relative pl-5 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {activeOffender.crimeTimeline.map((item, idx) => (
                      <div
                        key={`${item.offense}-${item.date}-${idx}`}
                        className="relative flex items-center justify-between rounded-squircle-sm border border-border bg-surface-alt p-2.5 text-xs transition-colors hover:border-border"
                      >
                        {/* Timeline Node Bullet */}
                        <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-destructive ring-4 ring-card" />

                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-medium text-foreground block truncate">
                            {item.offense}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground shrink-0">
                          <Calendar className="h-3 w-3 opacity-60" />
                          <span>{item.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <EmptyState
                  icon={FileText}
                  title={t("repeat_offenders.no_selection_title")}
                  description={t("repeat_offenders.no_selection_desc")}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  switch (level) {
    case "CRITICAL":
      return (
        <Badge
          variant="destructive"
          className="font-mono text-[10px] uppercase font-bold tracking-wider"
        >
          CRITICAL
        </Badge>
      );
    case "HIGH":
      return (
        <Badge
          variant="warning"
          className="font-mono text-[10px] uppercase font-bold tracking-wider"
        >
          HIGH
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge
          variant="info"
          className="font-mono text-[10px] uppercase font-bold tracking-wider"
        >
          MEDIUM
        </Badge>
      );
    case "LOW":
      return (
        <Badge
          variant="success"
          className="font-mono text-[10px] uppercase font-bold tracking-wider"
        >
          LOW
        </Badge>
      );
  }
}

function getRecidivismBarColor(score: number): string {
  if (score >= 80) return "bg-destructive";
  if (score >= 65) return "bg-warn";
  if (score >= 45) return "bg-info";
  return "bg-success";
}
