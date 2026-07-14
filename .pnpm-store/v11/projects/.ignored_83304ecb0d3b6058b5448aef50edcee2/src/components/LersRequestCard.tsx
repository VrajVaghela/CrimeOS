import { useEffect, useState } from "react";
import type { LegalRequest } from "../types/legalRequest";
import { LEGAL_REQUEST_STATUS_COLORS } from "../constants/legalRequest";

export interface LersRequestCardProps {
  request: LegalRequest;
  providerName?: string;
  highlighted?: boolean;
  onApprove?: (id: string) => Promise<void>;
}

function formatSlaCountdown(slaDueAt: string): string {
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffMs = due - now;

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs);
    const hours = Math.floor(overdueMs / (1000 * 60 * 60));
    const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Overdue by ${hours}h ${mins}m`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m remaining`;
}

export function LersRequestCard({
  request,
  providerName,
  highlighted,
  onApprove,
}: LersRequestCardProps) {
  const [slaLabel, setSlaLabel] = useState(() =>
    formatSlaCountdown(request.sla_due_at)
  );
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setSlaLabel(formatSlaCountdown(request.sla_due_at));
    const interval = setInterval(() => {
      setSlaLabel(formatSlaCountdown(request.sla_due_at));
    }, 60_000);
    return () => clearInterval(interval);
  }, [request.sla_due_at]);

  const handleApprove = async () => {
    if (!onApprove) return;
    setApproving(true);
    try {
      await onApprove(request.id);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div
      id={`request-${request.id}`}
      className={`p-4 border rounded-lg ${
        highlighted ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{request.request_number}</h3>
          <p className="text-sm text-gray-600">
            {providerName ?? request.provider_id.slice(0, 8)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {request.template_type.replace(/_/g, " ")}
          </p>
        </div>
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
            LEGAL_REQUEST_STATUS_COLORS[request.status] ??
            "bg-gray-100 text-gray-800"
          }`}
        >
          {request.status}
        </span>
      </div>

      <p
        className={`mt-3 text-sm ${
          slaLabel.startsWith("Overdue") ? "text-red-600" : "text-gray-600"
        }`}
      >
        SLA: {slaLabel}
      </p>

      {request.status === "DRAFTED" && onApprove && (
        <button
          onClick={handleApprove}
          disabled={approving}
          className="mt-3 px-3 py-1.5 bg-green-600 text-white text-sm rounded disabled:opacity-50"
        >
          {approving ? "Approving…" : "Approve"}
        </button>
      )}
    </div>
  );
}
