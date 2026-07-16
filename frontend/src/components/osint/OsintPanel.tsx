import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "../../api/client";
import { getEntityScanResult } from "../../api/osint";
import type { EntityScanResult } from "../../types/osint";
import { BreachRiskTable } from "./BreachRiskTable";
import { RiskSummaryBanner } from "./RiskSummaryBanner";
import { SocialProfileGrid } from "./SocialProfileGrid";

interface OsintPanelProps {
  caseId: string;
  entityId: string;
}

export function OsintPanel({ caseId, entityId }: OsintPanelProps) {
  const [scanResult, setScanResult] = useState<EntityScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchScanResult = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await getEntityScanResult(caseId, entityId);
      setScanResult(response.osint);
    } catch (err) {
      if (err instanceof Error && err.name === "ApiError" && (err as any).status === 404) {
        setNotFound(true);
        setScanResult(null);
        return;
      }
      setError(friendlyError(err, "Failed to load OSINT enrichment"));
    } finally {
      setLoading(false);
    }
  }, [caseId, entityId]);

  useEffect(() => {
    fetchScanResult();
  }, [fetchScanResult]);

  useEffect(() => {
    if (!scanResult || scanResult.scan.status === "COMPLETED" || scanResult.scan.status === "FAILED" || notFound) {
      return;
    }

    const pollTimer = window.setInterval(fetchScanResult, 3000);
    return () => window.clearInterval(pollTimer);
  }, [fetchScanResult, notFound, scanResult]);

  const isInProgress = scanResult?.scan.status === "PENDING" || scanResult?.scan.status === "RUNNING";

  return (
    <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-xl ring-1 ring-slate-800">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            OSINT enrichment
          </p>
          <h2 className="text-xl font-semibold text-white">
            Confirmed entity intelligence
          </h2>
        </div>
        {scanResult && (
          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Status: {scanResult.scan.status}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 rounded-3xl bg-slate-900/80 p-6 text-slate-400">
          <div className="h-4 w-3/5 rounded bg-slate-800 animate-pulse"></div>
          <div className="h-4 w-full rounded bg-slate-800 animate-pulse"></div>
          <div className="h-4 w-4/5 rounded bg-slate-800 animate-pulse"></div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-950/80 p-6 text-rose-200">
          <p className="font-semibold">Unable to load OSINT data</p>
          <p className="mt-2 text-sm text-rose-200">{error}</p>
          <button
            onClick={fetchScanResult}
            className="mt-4 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
          >
            Retry
          </button>
        </div>
      ) : notFound ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-slate-300">
          <p className="font-semibold text-white">No OSINT scan found yet.</p>
          <p className="mt-2 text-sm text-slate-400">
            The confirmed entity has not been enriched with OSINT yet. It may take a moment after confirmation for the scan to appear.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <RiskSummaryBanner summary={scanResult?.risk_summary ?? { total_breaches: 0, critical_breaches: 0, platforms_found: 0, overall_risk_level: "LOW" }} />

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Social match results
                </p>
                <SocialProfileGrid profiles={scanResult?.social_profiles ?? []} />
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Breach exposure
                </p>
                <BreachRiskTable breaches={scanResult?.breaches ?? []} />
              </div>
            </div>
          </div>

          {scanResult?.scan.status === "FAILED" && (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-950/70 p-5 text-amber-100">
              <p className="font-semibold">OSINT scan failed</p>
              <p className="mt-2 text-sm text-amber-200">
                {scanResult?.scan.error_message ?? "Please try again later or confirm the entity again."}
              </p>
              <button
                onClick={fetchScanResult}
                className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Refresh scan status
              </button>
            </div>
          )}

          {isInProgress && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 text-slate-300">
              <p className="font-semibold">OSINT enrichment is in progress.</p>
              <p className="mt-2 text-sm text-slate-400">
                This page will refresh automatically while the scan is still running.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
