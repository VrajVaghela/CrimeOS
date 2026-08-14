"use client";

import React, { useRef, useState } from "react";
import { Plus, Minus, RotateCcw, Move } from "lucide-react";
import {
  SURAT_OUTER_BOUNDARY,
  TAPI_RIVER_NORTH_BANK,
  TAPI_RIVER_SOUTH_BANK,
  type HeatmapPoint,
  type RiskZone,
} from "@/lib/heatmapData";
import { ClusterRing } from "./ClusterRing";

interface HeatmapCanvasProps {
  points: HeatmapPoint[];
  zones: RiskZone[];
}

export function HeatmapCanvas({ points, zones }: HeatmapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const W = 800;
  const H = 520;

  // ── Interactive Pan & Zoom State ──────────────────────────────────────────
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Coords Normalization (Official SMC Bounds) ───────────────────────────
  const allLats: number[] = [];
  const allLngs: number[] = [];

  points.forEach((p) => {
    allLats.push(p.lat);
    allLngs.push(p.lng);
  });
  zones.forEach((z) => {
    allLats.push(z.lat);
    allLngs.push(z.lng);
    z.boundary?.forEach(([lat, lng]) => {
      allLats.push(lat);
      allLngs.push(lng);
    });
  });
  SURAT_OUTER_BOUNDARY.forEach(([lat, lng]) => {
    allLats.push(lat);
    allLngs.push(lng);
  });

  const rawMinLat = allLats.length ? Math.min(...allLats) : 21.050;
  const rawMaxLat = allLats.length ? Math.max(...allLats) : 21.320;
  const rawMinLng = allLngs.length ? Math.min(...allLngs) : 72.700;
  const rawMaxLng = allLngs.length ? Math.max(...allLngs) : 72.945;

  const minLat = rawMinLat - 0.012;
  const maxLat = rawMaxLat + 0.012;
  const minLng = rawMinLng - 0.015;
  const maxLng = rawMaxLng + 0.015;

  const toX = (lng: number) =>
    ((lng - minLng) / (maxLng - minLng || 1)) * (W - 100) + 50;
  const toY = (lat: number) =>
    H - ((lat - minLat) / (maxLat - minLat || 1)) * (H - 100) - 50;

  const zoneColors: Record<string, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f59e0b",
    MODERATE: "#3b82f6",
    SAFE: "#10b981",
  };

  const typeColor: Record<string, string> = {
    Theft: "#f59e0b",
    Assault: "#ef4444",
    "Cyber Fraud": "#06b6d4",
    Murder: "#dc2626",
    Robbery: "#f97316",
    "Drug Offense": "#8b5cf6",
    Fraud: "#3b82f6",
    Kidnapping: "#ec4899",
    "Chain Snatching": "#f59e0b",
    Extortion: "#ef4444",
    "Vehicle Theft": "#3b82f6",
    Burglary: "#8b5cf6",
    "Petty Theft": "#10b981",
  };

  // Helper strings for complex map polygons & paths
  const outerSuratPointsStr = SURAT_OUTER_BOUNDARY
    .map(([lat, lng]) => `${toX(lng)},${toY(lat)}`)
    .join(" ");

  // Tapi River S-Curve Ribbon
  const tapiRiverRibbonStr = [
    ...TAPI_RIVER_NORTH_BANK.map(([lat, lng]) => `${toX(lng)},${toY(lat)}`),
    ...[...TAPI_RIVER_SOUTH_BANK].reverse().map(([lat, lng]) => `${toX(lng)},${toY(lat)}`),
  ].join(" ");

  // ── Wheel Zoom Handler ────────────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prevZoom) => Math.min(Math.max(prevZoom * zoomFactor, 0.6), 5));
  };

  // ── Drag & Pan Handlers ───────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // ── Control Actions ───────────────────────────────────────────────────────
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.6));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-[12px] border border-border bg-[#0a0f1a] shadow-2xl select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-[520px]"
        style={{ minHeight: 480 }}
      >
        <defs>
          <filter id="blur2">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="blur1">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#050b14" />
          </radialGradient>
        </defs>

        {/* Deep Map Background (fixed) */}
        <rect width={W} height={H} fill="url(#mapBg)" />

        {/* Dynamic Zoom & Pan Container */}
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{
            transformOrigin: "400px 260px",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {/* Tactical Blueprint Grid lines (15 horizontal, 20 vertical) */}
          {Array.from({ length: 15 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              x2={W}
              y1={(i * H) / 15}
              y2={(i * H) / 15}
              stroke="rgba(6,182,212,0.05)"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(i * W) / 20}
              x2={(i * W) / 20}
              y1={0}
              y2={H}
              stroke="rgba(6,182,212,0.05)"
              strokeWidth={0.5}
            />
          ))}

          {/* ── Layer 1: Official SMC Administrative Sector Segmentation ───── */}
          {zones.map((zone, i) => {
            if (!zone.boundary || zone.boundary.length === 0) return null;
            const pointsStr = zone.boundary
              .map(([lat, lng]) => `${toX(lng)},${toY(lat)}`)
              .join(" ");
            const col = zoneColors[zone.level] || "#3b82f6";

            return (
              <g key={`smc_sector_${i}`} className="sector-polygon group">
                {/* Sector Background Fill & Gap Borders (Matching Image) */}
                <polygon
                  points={pointsStr}
                  fill={col}
                  fillOpacity={0.16}
                  stroke="#0a0f1a"
                  strokeWidth={3}
                  className="transition-all duration-300 group-hover:fill-opacity-28"
                />
                <polygon
                  points={pointsStr}
                  fill="none"
                  stroke={col}
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  strokeDasharray="4 2"
                />
              </g>
            );
          })}

          {/* ── Layer 2: Tapi River S-Curve Channel Ribbon (Seamless fill, no border) ─ */}
          <polygon
            points={tapiRiverRibbonStr}
            fill="#032b45"
            fillOpacity={0.9}
            stroke="none"
          />

          {/* Tapi River Label */}
          <text
            x={toX(72.825)}
            y={toY(21.242)}
            fill="#06b6d4"
            fontSize={9}
            fontFamily="var(--font-mono), ui-monospace, monospace"
            fontWeight="bold"
            letterSpacing={2}
            opacity={0.85}
            className="select-none tracking-widest uppercase drop-shadow"
          >
            TAPI RIVER S-CURVE
          </text>



          {/* ── Layer 4: Dense Glowing Micro-scatter Crime Points ───────────── */}
          {points.slice(0, 600).map((p, i) => {
            const cx = toX(p.lng);
            const cy = toY(p.lat);
            const col = typeColor[p.type] || "#06b6d4";
            const r = p.weight === 5 ? 5.5 : p.weight >= 3 ? 4 : 2.5;
            const opacity = p.weight >= 4 ? 0.75 : p.weight >= 2 ? 0.5 : 0.35;

            return (
              <circle
                key={`p_${i}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={col}
                fillOpacity={opacity}
                filter={p.weight >= 3 ? "url(#blur1)" : undefined}
              />
            );
          })}

          {/* ── Layer 5: Glassmorphic Cluster Rings Foreground Layer ─────────── */}
          {zones.map((z, i) => {
            const cx = toX(z.lng);
            const cy = toY(z.lat);
            const col = zoneColors[z.level] || "#3b82f6";
            return <ClusterRing key={`z_${i}`} zone={z} cx={cx} cy={cy} color={col} />;
          })}
        </g>

        {/* Bottom-Right Coordinates Indicator (fixed) */}
        <text
          x={W - 16}
          y={H - 14}
          textAnchor="end"
          fill="rgba(168, 159, 145, 0.6)"
          fontSize={10}
          fontFamily="var(--font-mono), ui-monospace, monospace"
          className="select-none"
        >
          21.320° N - 21.050° N (SMC Municipal Limit)
        </text>
      </svg>

      {/* ── Top-Left Floating Pan & Zoom Controls ────────────────────────────── */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 rounded-squircle border border-border/80 bg-[#0d1520]/85 p-1.5 backdrop-blur-md shadow-lg">
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="flex h-8 w-8 items-center justify-center rounded-squircle-sm text-foreground hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="flex h-8 w-8 items-center justify-center rounded-squircle-sm text-foreground hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="my-0.5 h-px bg-border/60" />
        <button
          onClick={handleReset}
          title="Reset View"
          className="flex h-8 w-8 items-center justify-center rounded-squircle-sm text-foreground hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <div className="px-1 py-0.5 text-center font-mono text-[9px] font-bold text-cyan-400">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* ── Top-Right Floating Risk Legend ─────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-10 rounded-squircle border border-border/80 bg-[#0d1520]/85 p-3.5 backdrop-blur-md text-xs font-mono space-y-2 shadow-lg pointer-events-auto">
        <div className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center justify-between gap-4">
          <span>SMC SECTOR MAP</span>
          <span className="flex items-center gap-1 text-[9px] text-cyan-400/80 font-normal lowercase">
            <Move className="h-3 w-3" /> drag &amp; scroll
          </span>
        </div>
        {[
          ["CRITICAL", "#ef4444"],
          ["HIGH", "#f59e0b"],
          ["MODERATE", "#3b82f6"],
          ["SAFE", "#10b981"],
        ].map(([level, color]) => (
          <div key={level} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-foreground text-[11px] font-medium">{level}</span>
          </div>
        ))}
        <div className="border-t border-border/60 pt-2 mt-2 text-muted-foreground text-[10px]">
          {points.length} incidents plotted
        </div>
      </div>
    </div>
  );
}
