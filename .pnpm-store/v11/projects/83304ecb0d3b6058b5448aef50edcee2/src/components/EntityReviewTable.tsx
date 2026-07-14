
import { useState } from "react";
import type { DigitalEntity } from "../types/entity";
import { EntityBadge } from "./EntityBadge";

export interface EntityReviewTableProps {
  entities: DigitalEntity[];
  onConfirm: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

/**
 * EntityReviewTable displays extracted entities and allows officers to confirm/reject them.
 * 
 * NOTE: This component enforces the backend's no-backward-transition rule:
 * once an entity is CONFIRMED or REJECTED, it cannot be changed back, so
 * no action buttons are rendered for those statuses.
 */
export function EntityReviewTable({
  entities,
  onConfirm,
  onReject,
}: EntityReviewTableProps) {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const safeEntities = entities || [];

  const filteredEntities = safeEntities.filter((entity) => {
    const typeMatch = typeFilter === "ALL" || entity.entity_type === typeFilter;
    const statusMatch =
      statusFilter === "ALL" || entity.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const allTypes = Array.from(
    new Set(safeEntities.map((e) => e.entity_type))
  );
  const allStatuses = Array.from(
    new Set(safeEntities.map((e) => e.status))
  );

  const statusColors: Record<string, string> = {
    EXTRACTED: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter">Entity Type:</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="ALL">All</option>
            {allTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="ALL">All</option>
            {allStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Raw Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntities.map((entity) => (
              <tr key={entity.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <EntityBadge entity={entity} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entity.raw_value}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[entity.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {entity.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {entity.status === "EXTRACTED" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConfirm(entity.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => onReject(entity.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
