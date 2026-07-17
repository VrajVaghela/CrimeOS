"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Phone,
  User,
  Globe,
  RefreshCw,
  Download,
  Check,
  X,
  ExternalLink,
  Lock,
  Database,
  Search,
} from "lucide-react";
import {
  getEntityOsintResult,
  triggerEntityOsint,
  exportDossier,
  confirmPivot,
  ignorePivot,
} from "@/lib/api";
import type { OsintScanResult, CaseEntityOut } from "@/lib/types";

interface OsintEnrichmentPanelProps {
  caseId: string;
  entity: CaseEntityOut;
  onPivotAction: () => Promise<void>;
}

export function OsintEnrichmentPanel({
  caseId,
  entity,
  onPivotAction,
}: OsintEnrichmentPanelProps) {
  const [scanResult, setScanResult] = useState<OsintScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pivotLoadingId, setPivotLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntityOsintResult(caseId, entity.id);
      setScanResult(data.osint);
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes("not found")) {
        setScanResult(null);
      } else {
        setError(err.message ?? "Failed to fetch OSINT results");
      }
    } finally {
      setLoading(false);
    }
  }, [caseId, entity.id]);

  useEffect(() => {
    void fetchResult();
  }, [fetchResult]);

  // Autorefresh/polling if scan is PENDING or RUNNING
  useEffect(() => {
    if (!scanResult) return;
    const status = scanResult.scan.status;
    if (status !== "PENDING" && status !== "RUNNING") return;

    const interval = setInterval(async () => {
      try {
        const data = await getEntityOsintResult(caseId, entity.id);
        setScanResult(data.osint);
      } catch {
        // ignore errors during auto-poll
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [caseId, entity.id, scanResult]);

  const handleTrigger = async () => {
    setTriggering(true);
    setError(null);
    try {
      await triggerEntityOsint(caseId, entity.id);
      // Immediately set mock scan state to PENDING to trigger polling UI
      setScanResult((prev) =>
        prev
          ? {
              ...prev,
              scan: { ...prev.scan, status: "PENDING" as const },
            }
          : {
              scan: {
                id: "",
                case_id: caseId,
                entity_id: entity.id,
                entity_type: entity.entity_type,
                entity_value: entity.canonical_value,
                status: "PENDING" as const,
                started_at: null,
                completed_at: null,
                error_message: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              social_profiles: [],
              breaches: [],
              risk_summary: {
                total_breaches: 0,
                critical_breaches: 0,
                platforms_found: 0,
                overall_risk_level: "LOW" as const,
              },
              discovered_footprints: [],
            }
      );
      await fetchResult();
    } catch (err: any) {
      setError(err.message ?? "Failed to trigger scan");
    } finally {
      setTriggering(false);
    }
  };

  const handleExport = async () => {
    if (!scanResult) return;
    setExporting(true);
    try {
      const text = await exportDossier(caseId, entity.id);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `osint_dossier_${entity.display_value.replace(/\s+/g, "_")}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message ?? "Failed to export dossier");
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmPivot = async (pivotId: string) => {
    setPivotLoadingId(pivotId);
    try {
      await confirmPivot(caseId, pivotId);
      await Promise.all([fetchResult(), onPivotAction()]);
    } catch (err: any) {
      setError(err.message ?? "Failed to confirm pivot");
    } finally {
      setPivotLoadingId(null);
    }
  };

  const handleIgnorePivot = async (pivotId: string) => {
    setPivotLoadingId(pivotId);
    try {
      await ignorePivot(caseId, pivotId);
      await Promise.all([fetchResult(), onPivotAction()]);
    } catch (err: any) {
      setError(err.message ?? "Failed to ignore pivot");
    } finally {
      setPivotLoadingId(null);
    }
  };

  const isSupportedType = ["email", "phone", "person", "username", "social_handle"].includes(
    entity.entity_type.toLowerCase()
  );

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40 glow-danger";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40 glow-warn";
      case "MEDIUM":
        return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
  };

  const getBreachSeverityColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-rose-500 font-bold";
      case "HIGH":
        return "text-amber-500 font-semibold";
      case "MEDIUM":
        return "text-yellow-400";
      default:
        return "text-emerald-400";
    }
  };

  if (!isSupportedType) {
    return (
      <div className="p-4 bg-secondary/30 rounded border border-border/40 text-center text-xs text-muted-foreground">
        OSINT scans are only supported for email, phone, or person/username entities.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header with status */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <span className="text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-wider block">
          OSINT Digital Footprint
        </span>
        {scanResult && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              scanResult.scan.status === "COMPLETED"
                ? "bg-success/10 text-success border-success/30"
                : scanResult.scan.status === "FAILED"
                ? "bg-danger/10 text-danger border-danger/30 animate-pulse"
                : "bg-primary/10 text-primary border-primary/30 animate-pulse"
            }`}
          >
            {scanResult.scan.status}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 rounded border border-rose-500/20 bg-rose-950/20 text-xs text-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading && !scanResult ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span>Fetching intelligence data…</span>
        </div>
      ) : !scanResult ? (
        <div className="p-6 rounded-squircle-sm border border-border bg-[#141414] text-center space-y-4">
          <Search className="h-10 w-10 mx-auto text-muted-foreground/30 animate-pulse" />
          <div className="space-y-1">
            <h5 className="text-sm font-semibold text-foreground">No OSINT Enrichment Found</h5>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              This entity has not been scanned yet. Run a deterministic OSINT lookup to map its footprints.
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-squircle bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${triggering ? "animate-spin" : ""}`} />
            Run OSINT Lookup
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Risk Level Banner */}
          <div
            className={`p-4 rounded-squircle border flex items-center justify-between ${getRiskColor(
              scanResult.risk_summary.overall_risk_level
            )}`}
          >
            <div className="flex items-center gap-2.5">
              {scanResult.risk_summary.overall_risk_level === "CRITICAL" ||
              scanResult.risk_summary.overall_risk_level === "HIGH" ? (
                <ShieldAlert className="h-6 w-6 shrink-0 animate-pulse" />
              ) : (
                <ShieldCheck className="h-6 w-6 shrink-0" />
              )}
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-mono tracking-wider font-semibold opacity-85">
                  Intelligence Risk Level
                </div>
                <div className="text-base font-bold font-mono">
                  {scanResult.risk_summary.overall_risk_level} RISK
                </div>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Download intelligence dossier report"
              className="p-2 rounded bg-foreground/5 hover:bg-foreground/15 border border-border text-foreground transition-all disabled:opacity-50 shrink-0"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Running state details */}
          {(scanResult.scan.status === "PENDING" || scanResult.scan.status === "RUNNING") && (
            <div className="p-4 rounded-squircle bg-[#161616] border border-border/40 text-center space-y-3">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary" />
              <div className="text-xs text-muted-foreground">
                OSINT scanners running. Mapping usernames, emails, breaches, and social handles…
              </div>
            </div>
          )}

          {scanResult.scan.status === "FAILED" && (
            <div className="p-4 rounded-squircle bg-rose-950/10 border border-rose-900/30 space-y-3">
              <div className="text-xs font-semibold text-rose-400">OSINT scan failed</div>
              <div className="text-xs text-rose-300 font-mono break-all bg-rose-950/20 p-2 rounded">
                {scanResult.scan.error_message ?? "Unknown scanner error occurred"}
              </div>
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-rose-500/40 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-medium transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${triggering ? "animate-spin" : ""}`} />
                Retry OSINT Lookup
              </button>
            </div>
          )}

          {/* Social Media profiles matches */}
          {scanResult.social_profiles.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider block">
                Social Matches ({scanResult.social_profiles.length})
              </span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {scanResult.social_profiles.map((profile, index) => (
                  <div
                    key={index}
                    className="p-3 rounded bg-secondary/50 border border-border/60 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-1">
                          {profile.platform}
                          {profile.is_verified && (
                            <ShieldCheck className="h-3 w-3 text-sky-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          @{profile.username}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[9px] font-mono px-1 rounded ${
                            profile.exists_confidence === "CONFIRMED"
                              ? "bg-success/15 text-success"
                              : profile.exists_confidence === "LIKELY"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted-foreground/10 text-muted-foreground"
                          }`}
                        >
                          {profile.exists_confidence}
                        </span>
                        {profile.follower_count !== null && (
                          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <span>{profile.follower_count.toLocaleString()} fans</span>
                            {profile.follower_count_delta !== null && (
                              <span
                                className={`text-[9px] ${
                                  profile.follower_count_delta > 0
                                    ? "text-success font-semibold"
                                    : "text-danger"
                                }`}
                              >
                                ({profile.follower_count_delta > 0 ? "+" : ""}
                                {profile.follower_count_delta})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {profile.bio && (
                      <p className="text-muted-foreground text-[11px] leading-relaxed break-words bg-foreground/5 p-1.5 rounded border border-border/20 font-sans">
                        {profile.bio}
                      </p>
                    )}

                    {(profile.location_hint || profile.timezone_hint) && (
                      <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-muted-foreground">
                        {profile.location_hint && (
                          <span className="flex items-center gap-0.5 bg-foreground/5 px-1 py-0.5 rounded border border-border/20">
                            <Globe className="h-2.5 w-2.5" />
                            {profile.location_hint}
                            {profile.location_changed && (
                              <span className="text-warn animate-pulse font-bold ml-0.5">!</span>
                            )}
                          </span>
                        )}
                        {profile.timezone_hint && (
                          <span className="flex items-center gap-0.5 bg-foreground/5 px-1 py-0.5 rounded border border-border/20">
                            TZ: {profile.timezone_hint}
                          </span>
                        )}
                        {profile.bio_changed && (
                          <span className="bg-warn/15 text-warn px-1 py-0.5 rounded border border-warn/25 animate-pulse">
                            Bio Changed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breach Exposure Table */}
          {scanResult.breaches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider block">
                Breach Exposure ({scanResult.breaches.length})
              </span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {scanResult.breaches.map((breach, index) => (
                  <div
                    key={index}
                    className="p-3 rounded bg-secondary/50 border border-border/60 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-rose-400 shrink-0" />
                        {breach.breach_name}
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold ${getBreachSeverityColor(
                          breach.severity
                        )}`}
                      >
                        {breach.severity}
                      </span>
                    </div>

                    <div className="text-[10px] text-muted-foreground font-mono grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {breach.breach_domain && (
                        <div>
                          Domain: <span className="text-foreground">{breach.breach_domain}</span>
                        </div>
                      )}
                      {breach.leak_date && (
                        <div>
                          Date: <span className="text-foreground">{breach.leak_date}</span>
                        </div>
                      )}
                      {breach.record_count !== null && (
                        <div>
                          Records: <span className="text-foreground">{breach.record_count.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {breach.exposed_data_classes.map((cls, ci) => (
                        <span
                          key={ci}
                          className="bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[9px] font-mono px-1 rounded"
                        >
                          {cls}
                        </span>
                      ))}
                    </div>

                    {breach.source_note && (
                      <div className="text-[10px] italic text-muted-foreground/80 font-mono mt-1 border-t border-border/30 pt-1">
                        Note: {breach.source_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discovered footprint pivots */}
          {scanResult.discovered_footprints.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider block">
                AI Discovered Footprints (Pivots)
              </span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {scanResult.discovered_footprints.map((pivot, index) => (
                  <div
                    key={pivot.entity_id}
                    className="p-3 rounded bg-amber-500/5 border border-amber-500/20 text-xs flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between min-w-0">
                      <div className="min-w-0">
                        <div className="font-bold text-foreground capitalize">
                          {pivot.entity_type.replace("_", " ")}
                        </div>
                        <div className="text-primary font-mono text-[11px] break-all">
                          {pivot.display_value}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1 py-0.5 rounded shrink-0">
                        {Math.round(pivot.confidence * 100)}% Confidence
                      </span>
                    </div>

                    {pivot.source_snippet && (
                      <p className="text-muted-foreground text-[10px] italic leading-tight break-words bg-foreground/5 p-1 rounded font-mono">
                        Source ({pivot.source_field}): "{pivot.source_snippet}"
                      </p>
                    )}

                    <div className="flex gap-2 justify-end mt-1 border-t border-border/20 pt-2">
                      <button
                        onClick={() => handleIgnorePivot(pivot.entity_id)}
                        disabled={pivotLoadingId !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border hover:bg-foreground/5 text-[10px] font-medium text-muted-foreground transition-all disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        Ignore
                      </button>
                      <button
                        onClick={() => handleConfirmPivot(pivot.entity_id)}
                        disabled={pivotLoadingId !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-semibold transition-all disabled:opacity-50"
                      >
                        {pivotLoadingId === pivot.entity_id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 font-bold" />
                        )}
                        Confirm Pivot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trigger Scan option */}
          <div className="pt-2 border-t border-border/40">
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-border hover:bg-foreground/5 text-xs text-muted-foreground font-medium transition-all"
            >
              <RefreshCw className={`h-3 w-3 ${triggering ? "animate-spin" : ""}`} />
              Re-run OSINT Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
