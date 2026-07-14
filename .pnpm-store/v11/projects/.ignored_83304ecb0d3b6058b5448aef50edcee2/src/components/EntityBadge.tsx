
import type { DigitalEntity } from "../types/entity";

const typeColors: Record<string, string> = {
  IP_ADDRESS: "bg-blue-100 text-blue-800",
  EMAIL: "bg-green-100 text-green-800",
  PHONE: "bg-yellow-100 text-yellow-800",
  UPI_ID: "bg-purple-100 text-purple-800",
  SOCIAL_HANDLE: "bg-pink-100 text-pink-800",
};

export interface EntityBadgeProps {
  entity: DigitalEntity;
}

export function EntityBadge({ entity }: EntityBadgeProps) {
  const isLowConfidence = entity.confidence_score < 0.8;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          typeColors[entity.entity_type] || "bg-gray-100 text-gray-800"
        }`}
      >
        {entity.entity_type.replace("_", " ")}
      </span>
      <span className="text-sm">{entity.normalized_value}</span>
      {isLowConfidence && (
        <span className="text-xs text-yellow-600">
          ⚠️ {Math.round(entity.confidence_score * 100)}%
        </span>
      )}
    </div>
  );
}
