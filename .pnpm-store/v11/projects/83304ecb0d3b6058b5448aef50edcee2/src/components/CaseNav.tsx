import { Link, useParams } from "react-router-dom";

const NAV_ITEMS = [
  { path: "intake", label: "Intake" },
  { path: "lers", label: "LERS Console" },
  { path: "dispatch", label: "Dispatch Tracker" },
  { path: "analytics", label: "Analytics" },
] as const;

export function CaseNav() {
  const { caseId } = useParams<{ caseId: string }>();

  if (!caseId) return null;

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      {NAV_ITEMS.map(({ path, label }) => (
        <Link
          key={path}
          to={`/cases/${caseId}/${path}`}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
