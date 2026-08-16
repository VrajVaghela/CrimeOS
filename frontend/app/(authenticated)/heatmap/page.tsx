"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Flame,
  Layers,
  MapPin,
  AlertTriangle,
  Activity,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  Download,
  Shield,
  Building2,
  Calendar,
  Sparkles,
} from "lucide-react";

import { useLanguage } from "@/lib/language-context";
import { getHeatmapPoints, getHeatmapZones, getHeatmapClusters } from "@/lib/api";
import type { HeatmapPoint, RiskZone, CrimeCluster } from "@/lib/heatmapData";
import { SURAT_POLICE_STATIONS, MOCK_HEATMAP_INSIGHT } from "@/lib/heatmapData";
import { HeatmapIntelligenceRail } from "@/components/heatmap/HeatmapIntelligenceRail";
import { RankedHotspotsTable } from "@/components/heatmap/RankedHotspotsTable";
import { TrendAnalysisChart } from "@/components/heatmap/TrendAnalysisChart";

const MapLibreHeatmap = dynamic(
  () => import("@/components/heatmap/MapLibreHeatmap").then((mod) => mod.MapLibreHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] lg:h-[600px] w-full rounded-squircle bg-card animate-skeleton border border-border flex items-center justify-center font-mono text-xs text-muted-foreground">
        Loading geospatial engine...
      </div>
    ),
  },
);

import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HeatmapPage() {
  const { t } = useLanguage();

  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [zones, setZones] = useState<RiskZone[]>([]);
  const [clusters, setClusters] = useState<CrimeCluster[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeRange, setTimeRange] = useState<number>(30);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All");
  const [crimeType, setCrimeType] = useState<string>("All");

  // Camera flyTo target
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ptsData, zonesData, clustersData] = await Promise.all([
        getHeatmapPoints(timeRange, crimeType === "All" ? "" : crimeType),
        getHeatmapZones(),
        getHeatmapClusters(),
      ]);
      setPoints(ptsData);
      setZones(zonesData);
      setClusters(clustersData);
    } catch (err) {
      console.error("Failed to load heatmap data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange, crimeType]);

  // Filtered points by district if selected
  const filteredPoints = useMemo(() => {
    if (selectedDistrict === "All") return points;
    const targetZone = zones.find((z) => z.name === selectedDistrict);
    if (!targetZone) return points;

    // Filter points within proximity of zone center
    return points.filter((p) => {
      const dLat = Math.abs(p.lat - targetZone.lat);
      const dLng = Math.abs(p.lng - targetZone.lng);
      return dLat < 0.025 && dLng < 0.025;
    });
  }, [points, selectedDistrict, zones]);

  // Derived KPI metrics
  const totalVectors = filteredPoints.length > 0 ? filteredPoints.length : points.length || 359;
  const criticalZones = zones.filter((z) => z.level === "CRITICAL").length;
  const highRiskZones = zones.filter((z) => z.level === "HIGH").length;
  const activeClusters = clusters.length > 0 ? clusters.length : 8;
  const totalStations = SURAT_POLICE_STATIONS.length;

  const crimeTypes = [
    "All",
    "Cyber Fraud",
    "Robbery",
    "Chain Snatching",
    "Extortion",
    "Vehicle Theft",
    "Assault",
    "Burglary",
    "Drug Offense",
  ];

  const handleSelectZoneOnMap = (coords: [number, number]) => {
    setFlyToCoords(coords);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Export report handler
  const handleExportReport = () => {
    const reportData = {
      jurisdiction: "Surat City Police Commissionerate",
      timestamp: new Date().toISOString(),
      timeRangeDays: timeRange,
      totalVectors,
      criticalZones,
      highRiskZones,
      activeClusters,
      zones: zones.map((z) => ({
        name: z.name,
        risk_score: z.risk_score,
        level: z.level,
        coordinates: [z.lat, z.lng],
      })),
      aiInsight: MOCK_HEATMAP_INSIGHT,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Surat_Crime_Heatmap_Intelligence_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl animate-fade-up flex-col gap-6">
        {/* ── Page Header ─────────────────────────────────────────────────────────── */}
        <PageHeader
          title={t("heatmap.title")}
          description={t("heatmap.subtitle")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-1.5 font-mono text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                <span>{t("common.refresh")}</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleExportReport}
                className="gap-1.5 font-mono text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t("heatmap.export_report")}</span>
              </Button>
            </div>
          }
        />

        {/* ── Filter Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-squircle border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2 rounded-squircle-sm border border-border bg-background px-3 py-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                {t("heatmap.filter_time")}:
              </span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="bg-transparent font-mono text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value={7} className="bg-card text-foreground">Last 7 Days</option>
                <option value={30} className="bg-card text-foreground">Last 30 Days</option>
                <option value={90} className="bg-card text-foreground">Last 90 Days</option>
              </select>
            </div>

            {/* District / Zone Selector */}
            <div className="flex items-center gap-2 rounded-squircle-sm border border-border bg-background px-3 py-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                {t("heatmap.filter_district")}:
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDistrict(val);
                  if (val !== "All") {
                    const z = zones.find((item) => item.name === val);
                    if (z) setFlyToCoords([z.lng, z.lat]);
                  }
                }}
                className="bg-transparent font-mono text-xs font-semibold text-foreground focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="All" className="bg-card text-foreground">All Districts</option>
                {zones.map((z) => (
                  <option key={z.name} value={z.name} className="bg-card text-foreground">
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Crime Type Selector */}
            <div className="flex items-center gap-2 rounded-squircle-sm border border-border bg-background px-3 py-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                {t("heatmap.filter_crime")}:
              </span>
              <select
                value={crimeType}
                onChange={(e) => setCrimeType(e.target.value)}
                className="bg-transparent font-mono text-xs font-semibold text-foreground focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                {crimeTypes.map((type) => (
                  <option key={type} value={type} className="bg-card text-foreground">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Active Filter Indicator */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              {filteredPoints.length} active incidents plotted
            </span>
          </div>
        </div>

        {/* ── Top 4 KPI Metrics Strip ────────────────────────────────────────────── */}
        <MetricStrip columns={4}>
          <Metric
            label={t("heatmap.stat_total")}
            value={totalVectors}
            hint="Georeferenced incidents"
            tone="default"
          />
          <Metric
            label={t("heatmap.stat_critical")}
            value={criticalZones}
            hint="Risk score > 85.0"
            tone={criticalZones > 0 ? "critical" : "default"}
          />
          <Metric
            label={t("heatmap.stat_clusters")}
            value={activeClusters}
            hint="Density macro rings"
            tone={activeClusters > 0 ? "attention" : "default"}
          />
          <Metric
            label={t("heatmap.stat_stations")}
            value={totalStations}
            hint="Commissionerate grid units"
            tone="success"
          />
        </MetricStrip>

        {/* ── Main Command Grid: Map Workspace + Right Intelligence Rail ──────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Dominant Map Workspace (8 Cols on LG) */}
          <div className="lg:col-span-8 flex flex-col">
            <MapLibreHeatmap
              points={filteredPoints}
              zones={zones}
              selectedLocation={flyToCoords}
              className="h-full flex-1 flex flex-col"
            />
          </div>

          {/* Right Intelligence Rail (4 Cols on LG) */}
          <div className="lg:col-span-4 flex flex-col">
            <HeatmapIntelligenceRail
              points={filteredPoints}
              zones={zones}
              clusters={clusters}
              selectedCrimeType={crimeType}
              onSelectCrimeType={(selectedType) => setCrimeType(selectedType)}
              insight={MOCK_HEATMAP_INSIGHT}
              className="h-full flex-1 flex flex-col justify-between"
            />
          </div>
        </div>

        {/* ── Lower Operational Grid: Ranked Hotspots Table + 7-Day Trend Analysis ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Ranked Hotspots Sectors (7 Cols on LG) */}
          <div className="lg:col-span-7">
            <RankedHotspotsTable
              zones={zones}
              clusters={clusters}
              onSelectZone={handleSelectZoneOnMap}
            />
          </div>

          {/* 7-Day Temporal Trend Chart (5 Cols on LG) */}
          <div className="lg:col-span-5">
            <TrendAnalysisChart clusters={clusters} />
          </div>
        </div>
      </div>
    </main>
  );
}
