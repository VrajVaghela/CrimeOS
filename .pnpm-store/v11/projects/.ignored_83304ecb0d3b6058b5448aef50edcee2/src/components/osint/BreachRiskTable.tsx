import type { DataBreach } from "../../types/osint";

interface BreachRiskTableProps {
  breaches: DataBreach[];
}

const severityOrder: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const severityStyle = {
  CRITICAL: "bg-rose-500/10 text-rose-200",
  HIGH: "bg-orange-500/10 text-orange-200",
  MEDIUM: "bg-amber-500/10 text-amber-200",
  LOW: "bg-emerald-500/10 text-emerald-200",
};

function formatValue(value?: string | null): string {
  return value || "—";
}

function formatCount(count?: number | null): string {
  return count == null ? "—" : count.toLocaleString();
}

function breachHighlightsPasswordsOrFinancial(exposedDataClasses: string[]) {
  return exposedDataClasses.includes("Passwords") || exposedDataClasses.includes("Financial Credentials");
}

export function BreachRiskTable({ breaches }: BreachRiskTableProps) {
  const sortedBreaches = [...breaches].sort((a, b) => {
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return (b.record_count || 0) - (a.record_count || 0);
  });

  if (sortedBreaches.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 text-sm text-slate-400">
        No breach data was found for this entity.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/95 p-4 shadow-sm ring-1 ring-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">
              Breach
            </th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">
              Domain
            </th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">
              Leaked data
            </th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">
              Record count
            </th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">
              Severity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {sortedBreaches.map((breach, index) => {
            const isCriticalRow = breachHighlightsPasswordsOrFinancial(breach.exposed_data_classes);
            const rowClassName = isCriticalRow
              ? "bg-rose-950/40 border-l-4 border-rose-600"
              : "";

            return (
              <tr
                key={breach.id || `${breach.breach_name}-${index}`}
                data-testid={`breach-row-${index}`}
                className={rowClassName}
              >
                <td className="px-4 py-4 font-semibold text-slate-100">
                  {breach.breach_name}
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {formatValue(breach.breach_domain)}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {breach.exposed_data_classes.join(", ")}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {formatCount(breach.record_count)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${severityStyle[breach.severity]}`}
                  >
                    {breach.severity}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
