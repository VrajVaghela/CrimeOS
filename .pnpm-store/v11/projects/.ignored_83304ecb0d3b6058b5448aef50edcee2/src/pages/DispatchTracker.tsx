import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getStatusSummary, listWithTimeline } from "../api/legalRequests";
import { dispatchLegalRequest, listDispatchEvents } from "../api/dispatch";
import { friendlyError } from "../api/client";
import type { LegalRequestWithEvents } from "../types/legalRequest";
import { getDispatchEvents } from "../types/legalRequest";
import { DispatchTimeline } from "../components/DispatchTimeline";
import { CaseNav } from "../components/CaseNav";
import { LEGAL_REQUEST_STATUS_COLORS } from "../constants/legalRequest";

export default function DispatchTracker() {
  const { caseId } = useParams<{ caseId: string }>();
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [timeline, setTimeline] = useState<LegalRequestWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!caseId) return;
    try {
      const [summaryRes, timelineRes] = await Promise.all([
        getStatusSummary(caseId),
        listWithTimeline(caseId),
      ]);
      setSummary(summaryRes.by_status || {});
      setTotal(summaryRes.total || 0);
      setTimeline(timelineRes.requests || []);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, "Failed to load dispatch data"));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pollRequestEvents = useCallback(
    async (requestId: string) => {
      if (!caseId) return;
      const endTime = Date.now() + 10_000;
      while (Date.now() < endTime) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          await listDispatchEvents(requestId);
          const [summaryRes, timelineRes] = await Promise.all([
            getStatusSummary(caseId),
            listWithTimeline(caseId),
          ]);
          setSummary(summaryRes.by_status || {});
          setTotal(summaryRes.total || 0);
          setTimeline(timelineRes.requests || []);
          const item = (timelineRes.requests || []).find(
            (t) => t.legal_request.id === requestId
          );
          const status = item?.legal_request.status;
          if (status === "ACKNOWLEDGED" || status === "RESPONDED") {
            break;
          }
        } catch {
          // keep polling until timeout
        }
      }
      setPollingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    },
    [caseId]
  );

  const handleDispatch = async (requestId: string) => {
    setDispatchingId(requestId);
    setPollingIds((prev) => new Set(prev).add(requestId));
    try {
      await dispatchLegalRequest(requestId);
      await loadData();
      pollRequestEvents(requestId);
    } catch (err) {
      setError(friendlyError(err, "Dispatch failed"));
      setPollingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">Dispatch Tracker</h1>
      <CaseNav />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-3 items-center">
        <span className="font-medium">Total: {total}</span>
        {Object.entries(summary).map(([status, count]) => (
          <span
            key={status}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              LEGAL_REQUEST_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800"
            }`}
          >
            {status}: {count}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      ) : timeline.length === 0 ? (
        <p className="text-gray-500">No legal requests to track.</p>
      ) : (
        <div className="space-y-6">
          {timeline.map((item) => {
            const req = item.legal_request;
            const events = getDispatchEvents(item);
            const isPolling = pollingIds.has(req.id);
            return (
              <div key={req.id} className="space-y-2">
                <DispatchTimeline request={req} dispatchEvents={events} />
                {req.status === "QUEUED" && (
                  <button
                    onClick={() => handleDispatch(req.id)}
                    disabled={dispatchingId === req.id || isPolling}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    {dispatchingId === req.id || isPolling
                      ? "Dispatching…"
                      : "Dispatch"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
