import { useEffect, useState } from "react";
import { listIntelligenceFlags } from "../api/intelligenceFlags";
import { friendlyError } from "../api/client";
import type { IntelligenceFlag } from "../types/intelligence";

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-200 text-red-900 border-red-400",
  HIGH: "bg-orange-100 text-orange-900 border-orange-300",
  MEDIUM: "bg-yellow-100 text-yellow-900 border-yellow-300",
  LOW: "bg-gray-100 text-gray-700 border-gray-300",
};

export interface IntelligenceFlagPanelProps {
  caseId: string;
}

export function IntelligenceFlagPanel({ caseId }: IntelligenceFlagPanelProps) {
  const [flags, setFlags] = useState<IntelligenceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await listIntelligenceFlags(caseId);
        const sorted = [...(res.flags || [])].sort(
          (a, b) =>
            (SEVERITY_ORDER[a.severity] ?? 99) -
            (SEVERITY_ORDER[b.severity] ?? 99)
        );
        setFlags(sorted);
      } catch (err) {
        setError(
          friendlyError(err, "Failed to load intelligence flags")
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [caseId]);

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded" />;
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No intelligence flags detected for this case yet.
      </p>
    );
  }

  const grouped = flags.reduce<Record<string, IntelligenceFlag[]>>(
    (acc, flag) => {
      if (!acc[flag.severity]) acc[flag.severity] = [];
      acc[flag.severity].push(flag);
      return acc;
    },
    {}
  );

  const severityKeys = Object.keys(grouped).sort(
    (a, b) => (SEVERITY_ORDER[a] ?? 99) - (SEVERITY_ORDER[b] ?? 99)
  );

  return (
    <div className="space-y-4">
      {severityKeys.map((severity) => (
        <div key={severity}>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {severity} ({grouped[severity].length})
          </h4>
          <div className="space-y-2">
            {grouped[severity].map((flag) => (
              <div
                key={flag.id}
                className={`p-3 border rounded-lg ${
                  SEVERITY_COLORS[flag.severity] ?? SEVERITY_COLORS.LOW
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">
                    {flag.flag_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs opacity-75">
                    {new Date(flag.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{flag.summary}</p>
                {(flag.record_ids.length > 0 || flag.raw_row_refs.length > 0) && (
                  <div className="text-xs mt-2 opacity-75 space-y-1">
                    {flag.record_ids.length > 0 && (
                      <p>
                        Records:{" "}
                        {flag.record_ids.map((id, index) => (
                          <span key={id}>
                            <a className="underline" href={`#record-${id}`}>
                              {id.slice(0, 8)}
                            </a>
                            {index < flag.record_ids.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    )}
                    {flag.raw_row_refs.length > 0 && (
                      <p>Raw rows: {flag.raw_row_refs.join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
