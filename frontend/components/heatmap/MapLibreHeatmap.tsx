"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Flame,
  Shield,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  MapPin,
  Crosshair,
  Radar,
  Map as MapIcon,
  Info,
} from "lucide-react";
import type { HeatmapPoint, RiskZone } from "@/lib/heatmapData";
import { SURAT_POLICE_STATIONS, pointsToGeoJSON } from "@/lib/heatmapData";
import { cn } from "@/lib/utils";
import { HeatmapCanvas } from "./HeatmapCanvas";

// Surat centroid coordinates
const SURAT_CENTER: [number, number] = [72.8311, 21.1702]; // [lng, lat]
const DEFAULT_ZOOM = 11.6;

interface MapLibreHeatmapProps {
  points: HeatmapPoint[];
  zones?: RiskZone[];
  selectedLocation?: [number, number] | null; // [lng, lat] to fly to
  onPointClick?: (point: HeatmapPoint) => void;
  className?: string;
}

/**
 * MapLibre GL v6 ships its web worker as a separate `maplibre-gl-worker.mjs`
 * and resolves it from `import.meta.url` at runtime. Webpack rewrites that to
 * the bundled chunk URL, so the default lookup asks for
 * `/_next/static/chunks/maplibre-gl-worker.mjs` — which does not exist. Next
 * answers with its HTML 404 page, and the browser rejects it: "Failed to load
 * module script: ... non-JavaScript MIME type of text/html".
 *
 * We serve the worker from public/maplibre/ instead. Pointing webpack at the
 * module with `new URL()` is the documented fix, but it emits only the worker
 * itself and not the `./maplibre-gl-shared.mjs` it imports relatively, so the
 * worker boots and then 404s on its sibling. Both files are copied into
 * public/ by scripts/sync-maplibre-worker.mjs, which keeps the relative import
 * intact and stays same-origin. See the MapLibre v5 -> v6 migration guide.
 */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export function MapLibreHeatmap({
  points,
  zones = [],
  selectedLocation,
  onPointClick,
  className = "",
}: MapLibreHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const stationMarkersRef = useRef<Marker[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);

  // In-map state
  const [viewMode, setViewMode] = useState<"map" | "radar">("map");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [intensity, setIntensity] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || viewMode !== "map") return;

    let isCancelled = false;

    try {
      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: SURAT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 9,
        maxZoom: 18,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(new NavigationControl({ showCompass: true }), "top-right");

      map.on("load", () => {
        if (isCancelled) return;
        setMapLoaded(true);
        setMapError(null);

        const geojsonData = pointsToGeoJSON(points);

        if (!map.getSource("incidents")) {
          map.addSource("incidents", {
            type: "geojson",
            data: geojsonData,
          });
        }

        if (!map.getLayer("incidents-heat")) {
          map.addLayer({
            id: "incidents-heat",
            type: "heatmap",
            source: "incidents",
            maxzoom: 16,
            paint: {
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "weight"],
                1, 0.2,
                3, 0.6,
                5, 1.0,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                9, 0.8 * intensity,
                12, 1.5 * intensity,
                15, 3.0 * intensity,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(0, 0, 0, 0)",
                0.15, "rgba(45, 126, 233, 0.35)",
                0.35, "rgba(45, 126, 233, 0.70)",
                0.55, "rgba(15, 157, 88, 0.85)",
                0.75, "rgba(255, 210, 0, 0.95)",
                0.90, "rgba(220, 0, 0, 1.0)",
                1.0, "rgba(255, 59, 48, 1.0)",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                9, 14,
                11, 22,
                13, 34,
                15, 50,
              ],
              "heatmap-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12, 0.9,
                15.5, 0.4,
                16, 0.1,
              ],
            },
          });
        }

        if (!map.getLayer("incidents-point")) {
          map.addLayer({
            id: "incidents-point",
            type: "circle",
            source: "incidents",
            minzoom: 12.5,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12.5, 3.5,
                15, 7,
                17, 12,
              ],
              "circle-color": [
                "match",
                ["get", "type"],
                "Cyber Fraud", "#2d7ee9",
                "Robbery", "#dc0000",
                "Extortion", "#ff3b30",
                "Assault", "#ffd200",
                "Drug Offense", "#a855f7",
                "Vehicle Theft", "#06b6d4",
                "Chain Snatching", "#f97316",
                "#dc0000",
              ],
              "circle-stroke-color": "#0b0b0b",
              "circle-stroke-width": 1.5,
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12.5, 0.6,
                14, 0.95,
              ],
            },
          });
        }

        map.on("click", "incidents-point", (e: any) => {
          if (!e.features || !e.features[0]) return;
          const feature = e.features[0];
          const coords = (feature.geometry?.coordinates || []).slice() as [number, number];
          const props = (feature.properties || {}) as { type: string; weight: number };

          if (popupRef.current) popupRef.current.remove();

          const popupHtml = `
            <div style="font-family: monospace; background: #171717; color: #fffaf0; padding: 10px; border-radius: 8px; border: 1px solid #342a24; font-size: 11px; min-width: 170px;">
              <div style="font-weight: 700; color: #dc0000; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>${props.type}</span>
                <span style="background: rgba(220,0,0,0.15); padding: 2px 6px; border-radius: 4px; font-size: 9px;">Severity ${props.weight}/5</span>
              </div>
              <div style="color: #a89f91; margin-top: 4px;">Lat: ${coords[1]?.toFixed(4)}° N</div>
              <div style="color: #a89f91;">Lng: ${coords[0]?.toFixed(4)}° E</div>
              <div style="color: #2d7ee9; margin-top: 6px; font-size: 10px; border-top: 1px solid #241f1b; padding-top: 4px;">Surat Municipal Jurisdiction</div>
            </div>
          `;

          const popup = new Popup({ offset: 12, closeButton: false })
            .setLngLat(coords)
            .setHTML(popupHtml)
            .addTo(map);

          popupRef.current = popup;
        });

        map.on("mouseenter", "incidents-point", () => {
          if (map) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "incidents-point", () => {
          if (map) map.getCanvas().style.cursor = "";
        });

        map.on("move", () => {
          if (map) {
            const center = map.getCenter();
            if (coordsRef.current) {
              coordsRef.current.textContent = `${center.lat.toFixed(3)}°N, ${center.lng.toFixed(3)}°E`;
            }
            if (zoomRef.current) {
              zoomRef.current.textContent = `Zoom ${map.getZoom().toFixed(1)}x`;
            }
          }
        });
      });

      // Observe map container resize for dynamic zero-gap layout adjustment
      const container = mapContainerRef.current;
      let resizeObserver: ResizeObserver | null = null;
      if (container) {
        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(container);
      }

      map.on("error", (e: any) => {
        console.warn("MapLibre GL notice:", e);
      });
    } catch (err) {
      console.warn("MapLibre initialization fallback:", err);
      setViewMode("radar");
    }

    return () => {
      isCancelled = true;
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
      if (popupRef.current) popupRef.current.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [viewMode]);

  // Update GeoJSON data whenever points change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || viewMode !== "map") return;
    const source = mapRef.current.getSource<GeoJSONSource>("incidents");
    source?.setData(pointsToGeoJSON(points));
  }, [points, mapLoaded, viewMode]);

  // Update layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || viewMode !== "map") return;
    const map = mapRef.current;

    if (map.getLayer("incidents-heat")) {
      map.setLayoutProperty("incidents-heat", "visibility", showHeatmap ? "visible" : "none");
    }
    if (map.getLayer("incidents-point")) {
      map.setLayoutProperty("incidents-point", "visibility", showPoints ? "visible" : "none");
    }
  }, [showHeatmap, showPoints, mapLoaded, viewMode]);

  // Update heatmap intensity multiplier
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || viewMode !== "map") return;
    const map = mapRef.current;
    if (map.getLayer("incidents-heat")) {
      map.setPaintProperty("incidents-heat", "heatmap-intensity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        9, 0.8 * intensity,
        12, 1.5 * intensity,
        15, 3.0 * intensity,
      ]);
    }
  }, [intensity, mapLoaded, viewMode]);

  // Render & update Police Station DOM markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || viewMode !== "map") return;
    const map = mapRef.current;

    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    if (!showStations) return;

    SURAT_POLICE_STATIONS.forEach((station) => {
      const el = document.createElement("div");
      el.className = "group cursor-pointer";
      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(45, 126, 233, 0.3); animation: ping-slow 2s infinite;"></div>
          <div style="position: relative; width: 18px; height: 18px; border-radius: 9999px; background: #171717; border: 2px solid #2d7ee9; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(45, 126, 233, 0.6);">
            <div style="width: 6px; height: 6px; border-radius: 9999px; background: #2d7ee9;"></div>
          </div>
        </div>
      `;

      const popupHtml = `
        <div style="font-family: monospace; background: #171717; color: #fffaf0; padding: 12px; border-radius: 8px; border: 1px solid #2d7ee9; font-size: 11px; min-width: 210px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: #2d7ee9;"></span>
            <span style="font-weight: 700; color: #fffaf0; font-size: 12px;">${station.name}</span>
          </div>
          <div style="color: #2d7ee9; font-size: 10px; font-weight: 600; text-transform: uppercase;">Division: ${station.division}</div>
          <div style="margin-top: 6px; color: #a89f91; font-size: 10px;">Contact: <span style="color: #fffaf0;">${station.contact}</span></div>
          <div style="color: #a89f91; font-size: 10px;">Active Officers: <span style="color: #0f9d58; font-weight: 700;">${station.activeOfficers} On Duty</span></div>
          <div style="margin-top: 6px; font-size: 9px; color: #a89f91; border-top: 1px solid #342a24; padding-top: 4px;">Surat Police Cyber Command Unit</div>
        </div>
      `;

      const popup = new Popup({ offset: 16, closeButton: false }).setHTML(popupHtml);

      const marker = new Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(map);

      stationMarkersRef.current.push(marker);
    });
  }, [showStations, mapLoaded, viewMode]);

  // Handle camera flyTo when selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) return;
    if (viewMode === "map" && mapRef.current) {
      mapRef.current.flyTo({
        center: selectedLocation,
        zoom: 14.2,
        essential: true,
        duration: 1600,
      });
    }
  }, [selectedLocation, viewMode]);

  const handleResetCenter = () => {
    if (viewMode === "map" && mapRef.current) {
      mapRef.current.flyTo({
        center: SURAT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0,
        essential: true,
        duration: 1200,
      });
    }
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={cn("relative w-full rounded-squircle overflow-hidden border border-border bg-card transition-all flex flex-col", className)}>
      {/* ── View Mode Switcher Header Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Surat Geospatial Viewport
          </span>
        </div>

        {/* View Mode Toggle: Map vs Tactical Radar */}
        <div className="flex items-center gap-1 rounded-squircle-sm border border-border bg-background p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-squircle-sm px-2.5 py-1 font-mono text-[11px] font-semibold transition-all ${
              viewMode === "map"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapIcon className="h-3 w-3" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("radar")}
            className={`flex items-center gap-1.5 rounded-squircle-sm px-2.5 py-1 font-mono text-[11px] font-semibold transition-all ${
              viewMode === "radar"
                ? "bg-info text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radar className="h-3 w-3" />
            <span>Tactical Radar</span>
          </button>
        </div>
      </div>

      {/* ── Viewport Area ──────────────────────────────────────────────────────────── */}
      {viewMode === "radar" ? (
        <div className="p-2 sm:p-3 flex-1 flex flex-col">
          <HeatmapCanvas points={points} zones={zones} />
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="relative w-full flex-1 min-h-[480px] lg:min-h-[580px] h-[520px] lg:h-full bg-[#0b0b0b]"
        >
          {/* Map Error Banner (if any) */}
          {mapError && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 rounded-squircle-sm border border-amber-500/40 bg-card px-3 py-2 text-xs font-mono text-amber-400">
              <Info className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{mapError}</span>
            </div>
          )}

          {/* ── Top-Left In-Map Operational HUD ──────────────────────────────────────── */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-2.5 rounded-squircle-sm border border-border bg-card/95 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
              <span className="hidden sm:flex items-center gap-1 text-foreground">
                <Crosshair className="h-3 w-3 text-info" />
                <span ref={coordsRef}>
                  {SURAT_CENTER[1].toFixed(3)}°N, {SURAT_CENTER[0].toFixed(3)}°E
                </span>
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span ref={zoomRef}>Zoom {DEFAULT_ZOOM.toFixed(1)}x</span>
              <span className="text-border">|</span>
              <span className="text-foreground font-semibold">{points.length} vectors</span>
            </div>
          </div>

          {/* ── Top-Right In-Map Layer Controls ──────────────────────────────────────── */}
          <div className="absolute top-3 right-14 sm:top-4 sm:right-16 z-10 flex items-center gap-1 rounded-squircle-sm border border-border bg-card/95 p-1 pointer-events-auto">
            {/* Heatmap Layer Toggle */}
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              title="Toggle GPU Heatmap Layer"
              className={`flex items-center gap-1 rounded-squircle-sm px-2 sm:px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                showHeatmap
                  ? "bg-destructive text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">Heatmap</span>
            </button>

            {/* Incident Points Toggle */}
            <button
              type="button"
              onClick={() => setShowPoints(!showPoints)}
              title="Toggle Incident Scatter Points"
              className={`flex items-center gap-1 rounded-squircle-sm px-2 sm:px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                showPoints
                  ? "bg-info text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">Incidents</span>
            </button>

            {/* Police Stations Toggle */}
            <button
              type="button"
              onClick={() => setShowStations(!showStations)}
              title="Toggle Police Station Markers"
              className={`flex items-center gap-1 rounded-squircle-sm px-2 sm:px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                showStations
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">Stations</span>
            </button>
          </div>

          {/* ── Bottom-Left In-Map Floating Tools & Intensity Preset ─────────────────── */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Intensity Multiplier Selector */}
            <div className="flex items-center gap-1.5 rounded-squircle-sm border border-border bg-card/95 px-2.5 py-1 text-xs font-mono">
              <Sparkles className="h-3.5 w-3.5 text-warn shrink-0" />
              <span className="hidden sm:inline text-[10px] text-muted-foreground uppercase font-bold">Intensity:</span>
              {[
                { label: "0.5x", val: 0.5 },
                { label: "1.0x", val: 1.0 },
                { label: "1.5x", val: 1.5 },
              ].map((item) => (
                <button
                  type="button"
                  key={item.val}
                  onClick={() => setIntensity(item.val)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-all ${
                    intensity === item.val
                      ? "bg-white/20 text-foreground font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Reset Surat Center */}
            <button
              type="button"
              onClick={handleResetCenter}
              title="Reset Camera to Surat Center"
              className="flex items-center gap-1 rounded-squircle-sm border border-border bg-card/95 px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground transition-all hover:border-info hover:text-info"
            >
              <RotateCcw className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">Reset Surat View</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen Map View"
              className="flex items-center justify-center rounded-squircle-sm border border-border bg-card/95 p-1.5 font-mono text-foreground transition-all hover:border-primary hover:text-primary"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* ── Bottom-Right Floating Density Legend & OpenFreeMap Attribution ───────── */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex flex-col items-end gap-1.5 pointer-events-auto">
            {/* Heatmap Density Spectrum Bar */}
            <div className="hidden xs:block rounded-squircle-sm border border-border bg-card/95 p-2 font-mono text-[10px]">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                <span>Low</span>
                <span className="text-destructive font-bold">Critical Surge</span>
              </div>
              <div className="h-2 w-36 sm:w-44 rounded-full bg-gradient-to-r from-info via-success via-warn via-destructive to-danger" />
              <div className="flex items-center justify-between text-[8px] text-muted-foreground mt-1">
                <span>Vector Intensity</span>
                <span>Surat Limits</span>
              </div>
            </div>

            {/* Mandatory OpenFreeMap / OSM Basemap Attribution */}
            <div className="rounded bg-[#0b0b0b]/90 px-2 py-0.5 font-mono text-[9px] text-muted-foreground border border-border/40">
              Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-foreground">OSM</a> | <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className="underline hover:text-foreground">OpenFreeMap</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
