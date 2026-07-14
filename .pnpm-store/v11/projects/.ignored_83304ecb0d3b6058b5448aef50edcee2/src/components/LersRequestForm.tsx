import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DigitalEntity } from "../types/entity";
import type {
  CreateLegalRequestRequest,
  LegalRequest,
  ServiceProvider,
} from "../types/legalRequest";
import { listEntities } from "../api/entities";
import { listServiceProviders } from "../api/legalRequests";
import { friendlyError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TEMPLATE_TYPE_DESCRIPTIONS } from "../constants/legalRequest";

export interface LersRequestFormProps {
  caseId: string;
  onSubmit: (data: CreateLegalRequestRequest) => Promise<{ legal_request: LegalRequest }>;
  onSuccess?: (request: LegalRequest) => void;
}

const TEMPLATE_TYPES = Object.keys(
  TEMPLATE_TYPE_DESCRIPTIONS
) as LegalRequest["template_type"][];

export function LersRequestForm({
  caseId,
  onSubmit,
  onSuccess,
}: LersRequestFormProps) {
  const { officerId, policeStation } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [confirmedEntities, setConfirmedEntities] = useState<DigitalEntity[]>(
    []
  );
  const [providerId, setProviderId] = useState("");
  const [templateType, setTemplateType] =
    useState<LegalRequest["template_type"]>("CDR_REQUEST");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [legalBasis, setLegalBasis] = useState("Section 91 CrPC");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [providerRes, entityRes] = await Promise.all([
          listServiceProviders(),
          listEntities(caseId, { status: "CONFIRMED" }),
        ]);
        setProviders((providerRes.providers || []).filter((p) => p.active));
        setConfirmedEntities(entityRes.entities || []);
      } catch (err) {
        setError(friendlyError(err, "Failed to load form data"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [caseId]);

  const providersByCategory = providers.reduce<
    Record<string, ServiceProvider[]>
  >((acc, provider) => {
    const cat = provider.provider_category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(provider);
    return acc;
  }, {});

  const toggleEntity = (id: string) => {
    setSelectedEntityIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId || selectedEntityIds.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const data: CreateLegalRequestRequest = {
        provider_id: providerId,
        template_type: templateType,
        linked_entity_ids: selectedEntityIds,
        drafted_by: officerId,
        issuing_officer_name: officerId,
        issuing_officer_designation: "Investigating Officer",
        police_station: policeStation,
        legal_basis: legalBasis,
      };
      const result = await onSubmit(data);
      setSelectedEntityIds([]);
      onSuccess?.(result.legal_request);
    } catch (err) {
      setError(friendlyError(err, "Failed to create legal request"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  if (confirmedEntities.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          No confirmed entities available. Confirm entities on the{" "}
          <Link
            to={`/cases/${caseId}/intake`}
            className="underline font-medium"
          >
            Intake page
          </Link>{" "}
          before drafting a legal request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-lg font-semibold">Draft Legal Request</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="provider" className="block text-sm font-medium mb-1">
          Service Provider
        </label>
        <select
          id="provider"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select provider…</option>
          {Object.entries(providersByCategory).map(([category, items]) => (
            <optgroup key={category} label={category.replace("_", " ")}>
              {items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="template-type" className="block text-sm font-medium mb-1">
          Template Type
        </label>
        <select
          id="template-type"
          value={templateType}
          onChange={(e) =>
            setTemplateType(e.target.value as LegalRequest["template_type"])
          }
          className="w-full border rounded px-3 py-2"
        >
          {TEMPLATE_TYPES.map((type) => (
            <option key={type} value={type} title={TEMPLATE_TYPE_DESCRIPTIONS[type]}>
              {type.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {TEMPLATE_TYPE_DESCRIPTIONS[templateType]}
        </p>
      </div>

      <div>
        <span className="block text-sm font-medium mb-2">
          Confirmed Entities
        </span>
        <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
          {confirmedEntities.map((entity) => (
            <label
              key={entity.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedEntityIds.includes(entity.id)}
                onChange={() => toggleEntity(entity.id)}
              />
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                {entity.entity_type}
              </span>
              {entity.raw_value}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="legal-basis" className="block text-sm font-medium mb-1">
          Legal Basis
        </label>
        <input
          id="legal-basis"
          type="text"
          value={legalBasis}
          onChange={(e) => setLegalBasis(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !providerId || selectedEntityIds.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Draft Request"}
      </button>
    </form>
  );
}
