"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, ShieldAlert, FileText, User, Filter, Activity } from "lucide-react";
import {
  REPEAT_OFFENDERS_DATA,
  type RiskLevel,
} from "@/lib/repeatOffendersData";
import { useLanguage } from "@/lib/language-context";

export default function RepeatOffendersPage() {
  const { t } = useLanguage();
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("ALL");
  const [selectedOffenderId, setSelectedOffenderId] = useState<string>(
    REPEAT_OFFENDERS_DATA[0]?.id || ""
  );

  // Filter offenders based on selected risk level dropdown
  const filteredOffenders = useMemo(() => {
    if (selectedRiskFilter === "ALL") {
      return REPEAT_OFFENDERS_DATA;
    }
    return REPEAT_OFFENDERS_DATA.filter(
      (offender) => offender.riskLevel === selectedRiskFilter
    );
  }, [selectedRiskFilter]);

  // Derived active selected offender object
  const activeOffender = useMemo(() => {
    const found = filteredOffenders.find((o) => o.id === selectedOffenderId);
    if (found) return found;
    return filteredOffenders[0] || null;
  }, [filteredOffenders, selectedOffenderId]);

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 p-4 lg:p-6 text-foreground font-sans animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span>{t("repeat_offenders.title")}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("repeat_offenders.subtitle")}
          </p>
        </div>

        {/* Right Side Risk Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="bg-card border border-border text-xs text-foreground rounded-squircle-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">{t("repeat_offenders.filter_all")}</option>
            <option value="CRITICAL">{t("repeat_offenders.filter_critical")}</option>
            <option value="HIGH">{t("repeat_offenders.filter_high")}</option>
            <option value="MEDIUM">{t("repeat_offenders.filter_medium")}</option>
            <option value="LOW">{t("repeat_offenders.filter_low")}</option>
          </select>
        </div>
      </div>

      {/* Main Workspace: Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 flex-1 overflow-hidden">
        {/* Left Panel / Table Column (~70% width on desktop) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 border border-border bg-card rounded-squircle overflow-hidden shadow-lg">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card/60 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                {t("repeat_offenders.registry_title")}
              </h2>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {filteredOffenders.length} profiles in database
            </span>
          </div>

          {/* Data Table Container */}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {filteredOffenders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <User className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  {t("repeat_offenders.no_offenders")}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-card border-b border-border font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">NAME</th>
                    <th className="px-3 py-3 font-semibold">AGE</th>
                    <th className="px-4 py-3 font-semibold">RECIDIVISM</th>
                    <th className="px-3 py-3 font-semibold">RISK</th>
                    <th className="px-3 py-3 font-semibold">CRIMES</th>
                    <th className="px-3 py-3 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {filteredOffenders.map((offender) => {
                    const isSelected = activeOffender?.id === offender.id;
                    return (
                      <tr
                        key={offender.id}
                        onClick={() => setSelectedOffenderId(offender.id)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isSelected
                            ? "bg-white/[0.04] border-l-4 border-l-primary"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* NAME Column */}
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-foreground">
                              {offender.name}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {offender.alias}
                            </span>
                          </div>
                        </td>

                        {/* AGE Column */}
                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {offender.age}
                        </td>

                        {/* RECIDIVISM Column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-background border border-border">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-destructive rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, offender.recidivismScore)
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {offender.recidivismScore.toFixed(1)}
                            </span>
                          </div>
                        </td>

                        {/* RISK Column */}
                        <td className="px-3 py-3">
                          <RiskBadge level={offender.riskLevel} />
                        </td>

                        {/* CRIMES Column */}
                        <td className="px-3 py-3 font-mono font-semibold text-foreground">
                          {offender.totalCases}
                        </td>

                        {/* ACTION Column */}
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOffenderId(offender.id);
                            }}
                            className={`p-1.5 rounded-squircle-sm transition-colors ${
                              isSelected
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                            title="Inspect Profile"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Panel / Inspector Column (~30% width on desktop) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 border border-border bg-card rounded-squircle overflow-hidden shadow-lg">
          {/* Header Bar */}
          <div className="border-b border-border px-4 py-3 bg-card/60 shrink-0">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {t("repeat_offenders.profile_title")}
            </h2>
          </div>

          {activeOffender ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar min-h-0">
              {/* Profile Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {activeOffender.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 font-mono text-xs text-muted-foreground">
                    <span>{activeOffender.alias}</span>
                    <span>•</span>
                    <span>{activeOffender.age} yrs</span>
                    <span>•</span>
                    <span>{activeOffender.gender}</span>
                  </div>
                </div>
                <RiskBadge level={activeOffender.riskLevel} />
              </div>

              {/* KPI Highlight Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Recidivism Score KPI Card */}
                <div className="bg-background border border-border rounded-squircle-sm p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    RECIDIVISM SCORE
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-destructive">
                      {activeOffender.recidivismScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                  </div>
                </div>

                {/* Total Cases KPI Card */}
                <div className="bg-background border border-border rounded-squircle-sm p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    TOTAL CASES
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold font-mono text-info">
                      {activeOffender.totalCases}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location Subtitle */}
              <div className="flex items-center gap-2 bg-background border border-border px-3 py-2.5 rounded-squircle-sm text-xs text-foreground">
                <MapPin className="h-4 w-4 text-destructive shrink-0" />
                <span className="font-mono text-muted-foreground">Active Sector:</span>
                <span className="font-semibold text-foreground truncate">
                  {activeOffender.location}
                </span>
              </div>

              {/* CRIME TIMELINE Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-info" />
                    <span>CRIME TIMELINE</span>
                  </h4>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {activeOffender.crimeTimeline.length} offenses
                  </span>
                </div>

                {/* Vertical Timeline List */}
                <div className="relative pl-3 space-y-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {activeOffender.crimeTimeline.map((item, idx) => (
                    <div
                      key={`${item.offense}-${item.date}-${idx}`}
                      className="relative flex items-center justify-between bg-background border border-border rounded-squircle-sm p-2.5 text-xs hover:border-info/40 transition-colors"
                    >
                      {/* Timeline Node Bullet */}
                      <span className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-destructive ring-4 ring-card" />

                      <span className="font-semibold text-foreground truncate pr-2">
                        {item.offense}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                        {item.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">Select an offender from the registry to view their profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  switch (level) {
    case "CRITICAL":
      return (
        <span className="inline-flex items-center rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold text-[#ef4444] border border-[#ef4444]/60 font-mono tracking-wider">
          CRITICAL
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold text-[#f59e0b] border border-[#f59e0b]/60 font-mono tracking-wider">
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold text-[#3b82f6] border border-[#3b82f6]/60 font-mono tracking-wider">
          MEDIUM
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold text-[#10b981] border border-[#10b981]/60 font-mono tracking-wider">
          LOW
        </span>
      );
  }
}
