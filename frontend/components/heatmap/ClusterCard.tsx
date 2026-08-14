"use client";

import React from "react";
import type { CrimeCluster } from "@/lib/heatmapData";

interface ClusterCardProps {
  cluster: CrimeCluster;
}

export function ClusterCard({ cluster }: ClusterCardProps) {
  // Sparkline path generator for 7-day trend
  const sparklinePoints = cluster.trend.map((val, idx) => {
    const x = (idx / (cluster.trend.length - 1)) * 70;
    const maxVal = Math.max(...cluster.trend, 1);
    const y = 24 - (val / maxVal) * 18;
    return `${x},${y}`;
  });
  const sparklineD = `M ${sparklinePoints.join(" L ")}`;

  return (
    <div className="group relative overflow-hidden rounded-squircle border border-border bg-card p-4 transition-all duration-130 hover:border-primary/40 hover:bg-[#1f1f1f] shadow-sm">
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-info opacity-80" />

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-mono text-xs font-bold text-primary tracking-wider uppercase">
            {cluster.district}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground tabular-nums">
              {cluster.count}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              incidents (7d)
            </span>
          </div>
        </div>

        {/* 7-Day Trend Sparkline */}
        <div className="h-6 w-16 opacity-80 group-hover:opacity-100 transition-opacity">
          <svg width="100%" height="100%" viewBox="0 0 70 24" preserveAspectRatio="none">
            <path
              d={sparklineD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-block rounded-squircle-sm bg-black px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400 border border-amber-500/20">
          {cluster.dominant_type}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
          Active Hotspot
        </span>
      </div>
    </div>
  );
}
