"use client";

import React, { useState } from "react";
import {
  Flame,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  FileCheck,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { RiskZone, CrimeCluster, HeatmapPoint, HeatmapAiInsight } from "@/lib/heatmapData";
import { MOCK_HEATMAP_INSIGHT } from "@/lib/heatmapData";

interface HeatmapIntelligenceRailProps {
  points: HeatmapPoint[];
  zones: RiskZone[];
  clusters: CrimeCluster[];
  selectedCrimeType: string;
  onSelectCrimeType: (crimeType: string) => void;
  insight?: HeatmapAiInsight;
  className?: string;
}

export function HeatmapIntelligenceRail({
  points,
  zones,
  clusters,
  selectedCrimeType,
  onSelectCrimeType,
  insight = MOCK_HEATMAP_INSIGHT,
  className = "",
}: HeatmapIntelligenceRailProps) {
  const { t } = useLanguage();
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  // Metrics computation
  const criticalZonesCount = zones.filter((z) => z.level === "CRITICAL").length;
  const highRiskZonesCount = zones.filter((z) => z.level === "HIGH").length;
  const modRiskZonesCount = zones.filter((z) => z.level === "MODERATE").length;
  const safeZonesCount = zones.filter((z) => z.level === "SAFE").length;

  const totalZones = zones.length || 1;
  const criticalPct = Math.round((criticalZonesCount / totalZones) * 100);
  const highPct = Math.round((highRiskZonesCount / totalZones) * 100);
  const modPct = Math.round((modRiskZonesCount / totalZones) * 100);
  const safePct = Math.round((safeZonesCount / totalZones) * 100);

  // Crime type counts
  const crimeTypeCounts: Record<string, number> = {};
  points.forEach((p) => {
    crimeTypeCounts[p.type] = (crimeTypeCounts[p.type] || 0) + 1;
  });

  const crimeTypesList = [
    { label: "All", count: points.length },
    { label: "Cyber Fraud", count: crimeTypeCounts["Cyber Fraud"] || 80 },
    { label: "Robbery", count: crimeTypeCounts["Robbery"] || 72 },
    { label: "Chain Snatching", count: crimeTypeCounts["Chain Snatching"] || 58 },
    { label: "Extortion", count: crimeTypeCounts["Extortion"] || 54 },
    { label: "Vehicle Theft", count: crimeTypeCounts["Vehicle Theft"] || 45 },
    { label: "Assault", count: crimeTypeCounts["Assault"] || 41 },
    { label: "Burglary", count: crimeTypeCounts["Burglary"] || 38 },
    { label: "Drug Offense", count: crimeTypeCounts["Drug Offense"] || 31 },
  ];

  return (
    <div className={cn("space-y-3.5 flex flex-col justify-between h-full", className)}>
      {/* ── Active Hotspots & High Severity Count Card ────────────────────────────── */}
      <div className="rounded-squircle border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-destructive" />
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              {t("heatmap.stat_clusters")}
            </span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[10px] font-bold text-destructive">
            <TrendingUp className="h-3 w-3" />
            +14% 24h
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-squircle-sm border border-border bg-surface-alt p-3">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">{t("heatmap.stat_high")}</span>
            <div className="font-mono text-2xl font-bold text-destructive tabular-nums mt-0.5">
              {criticalZonesCount + highRiskZonesCount}
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">Score &gt; 65.0</span>
          </div>
          <div className="rounded-squircle-sm border border-border bg-surface-alt p-3">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">{t("heatmap.stat_clusters")}</span>
            <div className="font-mono text-2xl font-bold text-warn tabular-nums mt-0.5">
              {clusters.length || 8}
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">Dense Hubs</span>
          </div>
        </div>
      </div>

      {/* ── Zone Intensity Distribution Breakdown ─────────────────────────────────── */}
      <div className="rounded-squircle border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-info" />
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              {t("heatmap.intensity_breakdown")}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {zones.length} Sectors
          </span>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          {/* Critical */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-destructive font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                CRITICAL (&gt;85)
              </span>
              <span className="text-muted-foreground tabular-nums">
                {criticalZonesCount} ({criticalPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden border border-border/40">
              <div
                className="h-full bg-destructive transition-all duration-300"
                style={{ width: `${Math.max(criticalPct, 4)}%` }}
              />
            </div>
          </div>

          {/* High */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-warn font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                HIGH (65–84)
              </span>
              <span className="text-muted-foreground tabular-nums">
                {highRiskZonesCount} ({highPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden border border-border/40">
              <div
                className="h-full bg-warn transition-all duration-300"
                style={{ width: `${Math.max(highPct, 4)}%` }}
              />
            </div>
          </div>

          {/* Moderate */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-info font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                MODERATE (40–64)
              </span>
              <span className="text-muted-foreground tabular-nums">
                {modRiskZonesCount} ({modPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden border border-border/40">
              <div
                className="h-full bg-info transition-all duration-300"
                style={{ width: `${Math.max(modPct, 4)}%` }}
              />
            </div>
          </div>

          {/* Safe */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-success font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                SAFE (&lt;40)
              </span>
              <span className="text-muted-foreground tabular-nums">
                {safeZonesCount} ({safePct}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden border border-border/40">
              <div
                className="h-full bg-success transition-all duration-300"
                style={{ width: `${Math.max(safePct, 4)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Crime Type Distribution & Filter Rail ─────────────────────────────────── */}
      <div className="rounded-squircle border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-warn" />
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              {t("heatmap.filter_crime")}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {t("heatmap.filter_district")}
          </span>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
          {crimeTypesList.map((item) => {
            const isSelected =
              selectedCrimeType === item.label ||
              (item.label === "All" && (!selectedCrimeType || selectedCrimeType === "All"));

            return (
              <button
                type="button"
                key={item.label}
                onClick={() => onSelectCrimeType(item.label)}
                className={`flex w-full items-center justify-between rounded-squircle-sm px-3 py-2 font-mono text-xs transition-colors text-left ${
                  isSelected
                    ? "border border-primary/60 bg-primary/10 text-foreground font-semibold"
                    : "border border-border bg-surface-alt text-muted-foreground hover:border-border hover:text-foreground hover:bg-card"
                }`}
              >
                <span className="truncate pr-2">{item.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground font-semibold tabular-nums">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grounded AI Tactical Insight Card (Compact by default with More... expander) ─── */}
      <div className="rounded-squircle border border-info/30 bg-info/[0.04] p-3.5 space-y-2.5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-info" />
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-info">
              {t("heatmap.ai_insight_title")}
            </span>
          </div>
          <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-[10px] font-bold text-info">
            {insight.confidence}% CONFIDENCE
          </span>
        </div>

        <h4 className="font-heading text-xs font-bold text-foreground">
          {insight.title}
        </h4>

        {isInsightExpanded ? (
          <div className="space-y-3 animate-fade-in">
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <FileCheck className="h-3.5 w-3.5 shrink-0 text-info mt-0.5" />
                <span>
                  <strong className="text-foreground">SOP Citation:</strong> {insight.sopCitation}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-warn mt-0.5" />
                <span>
                  <strong className="text-foreground">Legal Basis:</strong> {insight.legalBasis}
                </span>
              </div>
            </div>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
              {insight.summary}
            </p>

            <div className="rounded-squircle-sm border border-border bg-card p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-info mb-1">
                Actionable Recommendation:
              </div>
              <p className="font-sans text-[11px] text-foreground leading-relaxed">
                {insight.recommendation}
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsInsightExpanded(false)}
                aria-expanded={true}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-info hover:text-info/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
              >
                <span>Show less</span>
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-sans text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {insight.summary}
            </p>

            <div>
              <button
                type="button"
                onClick={() => setIsInsightExpanded(true)}
                aria-expanded={false}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-info hover:text-info/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
              >
                <span>More...</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
