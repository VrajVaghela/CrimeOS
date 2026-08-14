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
  const isCritical = zone.level === "CRITICAL";

  return (
    <g className="cluster-ring group cursor-pointer transition-all duration-300">
      {/* Outer blurred halo */}
      <circle
        cx={cx}
        cy={cy}
        r={55}
        fill={color}
        fillOpacity={0.06}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.3}
        filter="url(#blur2)"
      />

      {/* Inner glassmorphic core ring */}
      <circle
        cx={cx}
        cy={cy}
        r={30}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.6}
        className="transition-all duration-200 group-hover:fill-opacity-25"
      />

      {/* Animated pulse ring for CRITICAL or HIGH risk zones */}
      {(isCritical || zone.level === "HIGH") && (
        <circle
          cx={cx}
          cy={cy}
          r={35}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.7}
        >
          <animate
            attributeName="r"
            values="30;55;30"
            dur="2.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.7;0;0.7"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

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

      {/* Risk Score Number inside ring */}
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
