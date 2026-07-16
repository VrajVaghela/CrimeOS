import type { RiskSummary } from "../../types/osint";

interface RiskSummaryBannerProps {
  summary: RiskSummary;
}

const severityStyles: Record<RiskSummary["overall_risk_level"], string> = {
  CRITICAL: "bg-rose-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-500 text-slate-950",
  LOW: "bg-emerald-500 text-slate-950",
};

export function RiskSummaryBanner({ summary }: RiskSummaryBannerProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-950/95 p-5 shadow-sm ring-1 ring-slate-800 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Overall risk
        </p>
        <p className="text-2xl font-semibold text-white">
          {summary.overall_risk_level}
        </p>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[summary.overall_risk_level]}`}>
          {summary.overall_risk_level}
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Total breaches
        </p>
        <p className="text-2xl font-semibold text-white">{summary.total_breaches}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Critical breaches
        </p>
        <p className="text-2xl font-semibold text-white">
          {summary.critical_breaches}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Platforms found
        </p>
        <p className="text-2xl font-semibold text-white">
          {summary.platforms_found}
        </p>
      </div>
    </div>
  );
}
