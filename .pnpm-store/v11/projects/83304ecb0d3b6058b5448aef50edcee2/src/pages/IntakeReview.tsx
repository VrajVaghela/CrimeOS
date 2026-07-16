
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEntities } from "../hooks/useEntities";
import { EntityReviewTable } from "../components/EntityReviewTable";
import { CaseNav } from "../components/CaseNav";
import { OsintPanel } from "../components/osint/OsintPanel";

export default function IntakeReview() {
  const { caseId } = useParams<{ caseId: string }>();
  const [sourceText, setSourceText] = useState("");
  const { entities, loading, error, extract, confirm, reject } = useEntities(
    caseId!
  );

  const handleExtract = async () => {
    try {
      await extract(sourceText);
    } catch {
      // Error is handled in useEntities
    }
  };

  // Compute summary counts
  const safeEntities = entities || [];
  const confirmedEntity = safeEntities.find((e) => e.status === "CONFIRMED");
  const confirmedCount = safeEntities.filter((e) => e.status === "CONFIRMED").length;
  const pendingCount = safeEntities.filter((e) => e.status === "EXTRACTED").length;
  const rejectedCount = safeEntities.filter((e) => e.status === "REJECTED").length;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Complaint Intake & Entity Review</h1>
      <CaseNav />

      {/* Summary strip */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg flex gap-6">
        <span className="font-medium text-green-700">
          {confirmedCount} confirmed
        </span>
        <span className="font-medium text-yellow-700">
          {pendingCount} pending
        </span>
        <span className="font-medium text-red-700">
          {rejectedCount} rejected
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Textarea and extract button */}
      <div className="mb-8">
        <label
          htmlFor="source-text"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Paste complaint text
        </label>
        <textarea
          id="source-text"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          rows={8}
          className="w-full border rounded-lg p-3"
          placeholder="Paste complaint text here to extract entities..."
        />
        <div className="mt-3">
          <button
            onClick={handleExtract}
            disabled={loading || !sourceText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Extracting..." : "Extract Entities"}
          </button>
        </div>
      </div>

      {/* Loading skeleton or table */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : entities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No entities extracted yet — paste complaint text above
        </div>
      ) : (
        <>
          <EntityReviewTable
            entities={entities}
            onConfirm={confirm}
            onReject={reject}
          />
          {confirmedEntity && (
            <OsintPanel caseId={caseId!} entityId={confirmedEntity.id} />
          )}
        </>
      )}
    </div>
  );
}
