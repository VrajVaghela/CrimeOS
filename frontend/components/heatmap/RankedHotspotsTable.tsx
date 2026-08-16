"use client";

import React from "react";
import {
  MapPin,
  Crosshair,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { RiskZone, CrimeCluster } from "@/lib/heatmapData";

interface RankedHotspotsTableProps {
  zones: RiskZone[];
  clusters: CrimeCluster[];
  onSelectZone: (coords: [number, number]) => void;
  className?: string;
}

export function RankedHotspotsTable({
  zones,
  clusters,
  onSelectZone,
  className = "",
}: RankedHotspotsTableProps) {
  const { t } = useLanguage();

  // Combine zones with cluster dominant crime types and sort by risk score descending
  const sortedZones = [...zones].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-info" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
            Ranked Hotspot Sectors
          </h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Sorted by composite risk score
        </span>
      </div>

      <div className="overflow-hidden rounded-squircle border border-border bg-card shadow-sm h-[260px] flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full min-w-[560px] text-left font-sans text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-card font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="w-14 px-4 py-2.5 bg-card">Rank</th>
                <th className="min-w-[140px] px-4 py-2.5 bg-card">District / Sector</th>
                <th className="w-28 px-4 py-2.5 bg-card">Risk Score</th>
                <th className="w-32 px-4 py-2.5 bg-card">Classification</th>
                <th className="w-36 px-4 py-2.5 bg-card">Primary Offense</th>
                <th className="w-24 px-4 py-2.5 bg-card text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono">
              {sortedZones.map((zone, idx) => {
                const cluster = clusters.find((c) => c.district.toLowerCase() === zone.name.toLowerCase());
                const dominantType = cluster?.dominant_type || "Cyber Fraud";

                const badgeColor =
                  zone.level === "CRITICAL"
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : zone.level === "HIGH"
                    ? "bg-warn/10 text-warn border-warn/30"
                    : zone.level === "MODERATE"
                    ? "bg-info/10 text-info border-info/30"
                    : "bg-success/10 text-success border-success/30";

                return (
                  <tr key={idx} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-bold text-muted-foreground tabular-nums">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-foreground">{zone.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {zone.lat.toFixed(3)}° N, {zone.lng.toFixed(3)}° E
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-foreground tabular-nums">
                      <span className="text-sm">{zone.risk_score.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground">/100</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-squircle-sm px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${badgeColor}`}
                      >
                        {zone.level}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground">
                        {dominantType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectZone([zone.lng, zone.lat])}
                        className="inline-flex items-center gap-1 rounded-squircle-sm border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-all hover:border-info hover:text-info shadow-sm"
                      >
                        <Crosshair className="h-3 w-3 text-info" />
                        <span>Focus</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
