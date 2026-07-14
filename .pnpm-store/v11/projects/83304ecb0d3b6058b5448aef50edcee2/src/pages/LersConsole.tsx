import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useLegalRequests } from "../hooks/useLegalRequests";
import { useAuth } from "../context/AuthContext";
import { LersRequestForm } from "../components/LersRequestForm";
import { LersRequestCard } from "../components/LersRequestCard";
import { CaseNav } from "../components/CaseNav";
import { listServiceProviders } from "../api/legalRequests";
import { useEffect } from "react";
import type { ServiceProvider } from "../types/legalRequest";

export default function LersConsole() {
  const { caseId } = useParams<{ caseId: string }>();
  const { officerId } = useAuth();
  const { requests, loading, error, create, approve } = useLegalRequests(
    caseId!
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);

  useEffect(() => {
    listServiceProviders()
      .then((res) => setProviders(res.providers))
      .catch(() => {});
  }, []);

  const providerMap = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [providers]);

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [requests]
  );

  const handleApprove = async (id: string) => {
    await approve(id, { approved_by: officerId });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">LERS Console</h1>
      <CaseNav />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8">
        <LersRequestForm
          caseId={caseId!}
          onSubmit={create}
          onSuccess={(request) => {
            setHighlightedId(request.id);
            setTimeout(() => setHighlightedId(null), 5000);
            document
              .getElementById(`request-${request.id}`)
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      <h2 className="text-lg font-semibold mb-4">Legal Requests</h2>

      {loading && sortedRequests.length === 0 ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      ) : sortedRequests.length === 0 ? (
        <p className="text-gray-500">No legal requests yet.</p>
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <LersRequestCard
              key={request.id}
              request={request}
              providerName={providerMap.get(request.provider_id)}
              highlighted={highlightedId === request.id}
              onApprove={handleApprove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
