"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Download,
  Check,
  X,
  ExternalLink,
  Lock,
  Search,
  AlertTriangle,
  Globe,
} from "lucide-react";
import {
  getEntityOsintResult,
  triggerEntityOsint,
  exportDossier,
  confirmPivot,
  ignorePivot,
  ApiError,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OsintScanResult, CaseEntityOut } from "@/lib/types";
import { interpolate, useLanguage } from "@/lib/language-context";
import { useEnumLabel } from "@/lib/i18n/enums";

/**
 * Open-source enrichment for one case identifier.
 *
 * This panel is the body of the OSINT section (`/cases/[id]/osint`), not a
 * sidebar widget: it lays findings out across the full content pane in two
 * columns and lets the page scroll. The previous version stacked every group
 * into a 310px rail behind three `max-h-[220px]` scrollboxes, so a scan with
 * four social matches and three breaches was read through three separate
 * peepholes.
 */

/** Entity types the backend OSINT scanners accept. */
export const OSINT_SUPPORTED_TYPES = [
  "email",
  "phone",
  "person",
  "username",
  "social_handle",
];

export function isOsintSupported(entityType: string): boolean {
  return OSINT_SUPPORTED_TYPES.includes(entityType.toLowerCase());
}

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
  const { t } = useLanguage();
  const { statusLabel } = useEnumLabel();
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch OSINT results";
      if ((err instanceof ApiError && err.code === "not_found") || message.toLowerCase().includes("not found")) {
        setScanResult(null);
      } else {
        setError(message);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to trigger scan");
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export dossier");
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmPivot = async (pivotId: string) => {
    setPivotLoadingId(pivotId);
    try {
      await confirmPivot(caseId, pivotId);
      await Promise.all([fetchResult(), onPivotAction()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to confirm pivot");
    } finally {
      setPivotLoadingId(null);
    }
  };

  const handleIgnorePivot = async (pivotId: string) => {
    setPivotLoadingId(pivotId);
    try {
      await ignorePivot(caseId, pivotId);
      await Promise.all([fetchResult(), onPivotAction()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to ignore pivot");
    } finally {
      setPivotLoadingId(null);
    }
  };

  const supported = isOsintSupported(entity.entity_type);
  /** The backend refuses scans on pivots the officer has not accepted yet.
   *  Entities default to `confirmed` server-side, so treat an absent status as
   *  confirmed rather than locking the panel behind a field that isn't there. */
  const scannable = supported && (entity.status ?? "confirmed").toLowerCase() === "confirmed";
  const isRunning =
    scanResult?.scan.status === "PENDING" || scanResult?.scan.status === "RUNNING";

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "border-destructive/40 bg-destructive/15 text-destructive glow-destructive";
      case "HIGH":
        return "border-warn/40 bg-warn/15 text-warn glow-warning";
      case "MEDIUM":
        return "border-warn/30 bg-warn/10 text-warn";
      default:
        return "border-success/30 bg-success/10 text-success";
    }
  };

  const sectionLabel = (text: string, count?: number) => (
    <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {text}
      {count !== undefined ? ` · ${count}` : null}
    </span>
  );

  if (!supported) {
    return (
      <section className="rounded-squircle border border-border/80 bg-card p-5">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {t("osint.title")}
          </h3>
        </div>
        <p className="rounded-squircle-sm border border-dashed border-border bg-surface-alt/40 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("osint.unsupported_type")}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-squircle border border-border/80 bg-card p-5">
      {/* One header for the whole panel: what it is, whether a scan is live,
          and the two actions that act on the scan as a whole. The re-run
          control used to sit as a full-width button at the very bottom, a
          screen away from the status it re-runs. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {t("osint.title")}
          </h3>
          {scanResult && (
            <Badge
              variant={
                scanResult.scan.status === "COMPLETED"
                  ? "success"
                  : scanResult.scan.status === "FAILED"
                    ? "destructive"
                    : "info"
              }
              dot={isRunning}
              pulse={isRunning}
              className="rounded-squircle-sm font-mono text-[10px] font-semibold uppercase"
            >
              {statusLabel(scanResult.scan.status)}
            </Badge>
          )}
        </div>

        {scanResult && scannable && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              loading={exporting}
              title={t("osint.download_dossier")}
            >
              {!exporting && <Download className="h-3.5 w-3.5" />}
              {t("osint.export_dossier")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrigger}
              disabled={triggering || isRunning}
              loading={triggering}
            >
              {!triggering && <RefreshCw className="h-3.5 w-3.5" />}
              {t("osint.rerun_scan")}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-squircle-sm border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground"
        >
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setError(null)}
            aria-label={t("common.dismiss")}
            className="h-6 w-6 shrink-0 text-destructive hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {!scannable ? (
        <p className="flex items-start gap-2 rounded-squircle-sm border border-warn/30 bg-warn/10 px-3.5 py-3 text-xs leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
          {t("osint.unconfirmed_hint")}
        </p>
      ) : loading && !scanResult ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-squircle-sm" />
          <Skeleton className="h-28 w-full rounded-squircle-sm" />
        </div>
      ) : !scanResult ? (
        <div className="flex flex-col items-center gap-4 rounded-squircle-sm border border-dashed border-border bg-surface-alt/40 px-6 py-10 text-center">
          <Search className="h-7 w-7 text-muted-foreground" />
          <div className="max-w-[46ch] space-y-1.5">
            <p className="font-heading text-base font-semibold text-foreground">
              {t("osint.none_found")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("osint.none_found_sub")}
            </p>
          </div>
          <Button onClick={handleTrigger} disabled={triggering} loading={triggering} size="sm">
            {!triggering && <RefreshCw className="h-3.5 w-3.5" />}
            {t("osint.run_lookup")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Risk level banner */}
          <div
            className={`flex items-center gap-3 rounded-squircle-sm border px-4 py-3.5 ${getRiskColor(
              scanResult.risk_summary.overall_risk_level
            )}`}
          >
            {scanResult.risk_summary.overall_risk_level === "CRITICAL" ||
            scanResult.risk_summary.overall_risk_level === "HIGH" ? (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldCheck className="h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] opacity-85">
                {t("osint.risk_level")}
              </div>
              <div className="font-mono text-base font-bold">
                {scanResult.risk_summary.overall_risk_level} {t("osint.risk_suffix")}
              </div>
            </div>
          </div>

          {isRunning && (
            <p className="flex items-center justify-center gap-2.5 rounded-squircle-sm border border-border bg-surface-alt px-4 py-4 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-info" />
              {t("osint.scanning_detail")}
            </p>
          )}

          {scanResult.scan.status === "FAILED" && (
            <div className="flex flex-col gap-3 rounded-squircle-sm border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-xs font-semibold text-destructive">{t("osint.scan_failed")}</p>
              <p className="break-all rounded-squircle-sm bg-destructive/10 p-2 font-mono text-xs text-foreground">
                {scanResult.scan.error_message ?? t("osint.unknown_error")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTrigger}
                disabled={triggering}
                loading={triggering}
                className="self-start border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {!triggering && <RefreshCw className="h-3.5 w-3.5" />}
                {t("osint.retry_lookup")}
              </Button>
            </div>
          )}

          {/* Social matches — two columns on the content pane rather than a
              220px scrollbox, so a full set of platforms is read at once. */}
          {scanResult.social_profiles.length > 0 && (
            <div className="flex flex-col gap-2">
              {sectionLabel(t("osint.social_presence"), scanResult.social_profiles.length)}
              <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                {scanResult.social_profiles.map((profile, index) => (
                  <div
                    key={`${profile.platform}-${profile.username}-${index}`}
                    className="flex flex-col gap-2 rounded-squircle-sm border border-border bg-surface-alt p-3.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span className="truncate">{profile.platform}</span>
                          {profile.is_verified && (
                            <ShieldCheck
                              className="h-3 w-3 shrink-0 text-info"
                              aria-label={t("common.verified")}
                            />
                          )}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          @{profile.username}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge
                          variant={
                            profile.exists_confidence === "CONFIRMED"
                              ? "success"
                              : profile.exists_confidence === "LIKELY"
                                ? "default"
                                : "outline"
                          }
                          className="rounded-squircle-sm font-mono text-[10px] uppercase"
                        >
                          {profile.exists_confidence}
                        </Badge>
                        {profile.follower_count !== null && (
                          <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <span>
                              {interpolate(t("osint.followers"), {
                                count: profile.follower_count.toLocaleString(),
                              })}
                            </span>
                            {profile.follower_count_delta !== null && (
                              <span
                                className={
                                  profile.follower_count_delta > 0
                                    ? "font-semibold text-success"
                                    : "text-danger"
                                }
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
                      <p className="break-words rounded-squircle-sm border border-border/40 bg-background p-2 text-[11px] leading-relaxed text-muted-foreground">
                        {profile.bio}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      {profile.location_hint && (
                        <span className="flex items-center gap-1 rounded-sm border border-border/40 bg-background px-1.5 py-0.5">
                          <Globe className="h-2.5 w-2.5" />
                          {profile.location_hint}
                          {profile.location_changed && (
                            <span className="font-bold text-warn">!</span>
                          )}
                        </span>
                      )}
                      {profile.timezone_hint && (
                        <span className="rounded-sm border border-border/40 bg-background px-1.5 py-0.5">
                          TZ {profile.timezone_hint}
                        </span>
                      )}
                      {profile.bio_changed && (
                        <Badge variant="warning" className="rounded-sm text-[10px]">
                          {t("osint.bio_changed")}
                        </Badge>
                      )}
                      {profile.profile_url && (
                        <a
                          href={profile.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          title={t("osint.open_profile")}
                          className="ml-auto flex items-center gap-1 rounded-sm px-1 py-0.5 text-info transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("osint.open_profile_short")}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breach exposure */}
          {scanResult.breaches.length > 0 && (
            <div className="flex flex-col gap-2">
              {sectionLabel(t("osint.breach_exposure"), scanResult.breaches.length)}
              <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                {scanResult.breaches.map((breach, index) => (
                  <div
                    key={`${breach.breach_name}-${index}`}
                    className="flex flex-col gap-2 rounded-squircle-sm border border-border bg-surface-alt p-3.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                        <Lock className="h-3 w-3 shrink-0 text-destructive" />
                        <span className="truncate">{breach.breach_name}</span>
                      </div>
                      <Badge
                        variant={
                          breach.severity === "CRITICAL" || breach.severity === "HIGH"
                            ? "destructive"
                            : breach.severity === "MEDIUM"
                              ? "warning"
                              : "success"
                        }
                        className="rounded-squircle-sm font-mono text-[10px] font-semibold uppercase"
                      >
                        {breach.severity}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                      {breach.breach_domain && (
                        <div className="truncate">
                          {t("osint.domain")}{" "}
                          <span className="text-foreground">{breach.breach_domain}</span>
                        </div>
                      )}
                      {breach.leak_date && (
                        <div className="truncate">
                          {t("osint.date")}{" "}
                          <span className="text-foreground">{breach.leak_date}</span>
                        </div>
                      )}
                      {breach.record_count !== null && (
                        <div className="truncate">
                          {t("osint.records")}{" "}
                          <span className="text-foreground">
                            {breach.record_count.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {breach.exposed_data_classes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {breach.exposed_data_classes.map((cls) => (
                          <Badge
                            key={cls}
                            variant="destructive"
                            className="rounded-sm font-mono text-[10px]"
                          >
                            {cls}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {breach.source_note && (
                      <p className="mt-auto border-t border-border/40 pt-2 font-mono text-[10px] italic text-muted-foreground">
                        {t("osint.note")}: {breach.source_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discovered footprint pivots — the only decision surface here, so it
              keeps the amber attention tint and sits last, after the evidence
              an officer needs to read before accepting one. */}
          {scanResult.discovered_footprints.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
              {sectionLabel(t("osint.pivots"), scanResult.discovered_footprints.length)}
              <ul className="flex flex-col gap-2.5">
                {scanResult.discovered_footprints.map((pivot) => (
                  <li
                    key={pivot.entity_id}
                    className="flex flex-col gap-2 rounded-squircle-sm border border-warn/30 bg-warn/[0.06] p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold capitalize text-foreground">
                          {pivot.entity_type.replace(/_/g, " ")}
                        </div>
                        <div className="break-all font-mono text-[11px] text-accent-strong">
                          {pivot.display_value}
                        </div>
                      </div>
                      <Badge
                        variant="warning"
                        className="shrink-0 rounded-squircle-sm font-mono text-[10px] font-semibold"
                      >
                        {Math.round(pivot.confidence * 100)}% {t("common.confidence")}
                      </Badge>
                    </div>

                    {pivot.source_snippet && (
                      <p className="break-words rounded-squircle-sm border border-border/40 bg-background p-2 font-mono text-[10px] italic leading-relaxed text-muted-foreground">
                        {t("osint.source")} ({pivot.source_field}): “{pivot.source_snippet}”
                      </p>
                    )}

                    <div className="flex justify-end gap-2 border-t border-warn/20 pt-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIgnorePivot(pivot.entity_id)}
                        disabled={pivotLoadingId !== null}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        {t("osint.ignore")}
                      </Button>
                      {/* Amber, not red: a pivot awaiting a decision is an
                          attention state, and a scan can surface several at
                          once — N red buttons would spend the screen's whole
                          accent budget on one list. */}
                      <Button
                        size="sm"
                        onClick={() => handleConfirmPivot(pivot.entity_id)}
                        disabled={pivotLoadingId !== null}
                        loading={pivotLoadingId === pivot.entity_id}
                        className="bg-warn text-warn-foreground hover:bg-warn/90 active:bg-warn/80"
                      >
                        {pivotLoadingId !== pivot.entity_id && <Check className="h-3 w-3" />}
                        {t("osint.confirm_pivot")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
