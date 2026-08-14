"use client";

import React from "react";
import type { RiskZone } from "@/lib/heatmapData";

interface ClusterRingProps {
  zone: RiskZone;
  cx: number;
  cy: number;
  color: string;
}

export function ClusterRing({ zone, cx, cy, color }: ClusterRingProps) {
  return (
    <g className="cluster-ring group cursor-pointer transition-all duration-300">
      {/* Outer soft blurred glowing halo (no border stroke) */}
      <circle
        cx={cx}
        cy={cy}
        r={55}
        fill={color}
        fillOpacity={0.15}
        stroke="none"
        filter="url(#blur2)"
      />

      {/* Inner glassmorphic core orb (no border stroke) */}
      <circle
        cx={cx}
        cy={cy}
        r={32}
        fill={color}
        fillOpacity={0.25}
        stroke="none"
        className="transition-all duration-200 group-hover:fill-opacity-40"
      />

      {/* Zone Title Label */}
      <text
        x={cx}
        y={cy - 36}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontWeight="bold"
        className="select-none tracking-wider drop-shadow-md"
      >
        {zone.name} [{Math.round(zone.risk_score)} {zone.level}]
      </text>

      {/* Risk Score Number inside orb */}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={12}
        fontWeight="bold"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        className="select-none drop-shadow"
      >
        {zone.risk_score.toFixed(0)}
      </text>

      {/* Risk Level Badge below score */}
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        fill={color}
        fontSize={8}
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontWeight="bold"
        opacity={0.85}
        className="select-none uppercase tracking-widest"
      >
        {zone.level}
      </text>
    </g>
  );
}
