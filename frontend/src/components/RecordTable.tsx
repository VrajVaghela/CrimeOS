import { useCallback, useEffect, useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export interface RecordTableProps<T> {
  columns: Column<T>[];
  fetchPage: (page: number, limit: number) => Promise<{ records: T[]; total: number }>;
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function RecordTable<T>({
  columns,
  fetchPage,
  rowKey,
  emptyMessage = "No records found.",
}: RecordTableProps<T>) {
  const [records, setRecords] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPage(page, limit);
      setRecords(result.records);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [fetchPage, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading && records.length === 0) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded" />;
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (records.length === 0) {
    return <p className="text-gray-500 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((row) => (
              <tr key={rowKey(row)} id={`record-${rowKey(row)}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {total} record{total !== 1 ? "s" : ""} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-2 py-1">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
