
import { useState, useCallback, useEffect } from "react";
import type { DigitalEntity } from "../types/entity";
import {
  extractEntities,
  listEntities,
  updateEntityStatus,
} from "../api/entities";
import { friendlyError } from "../api/client";

export function useEntities(caseId: string) {
  const [entities, setEntities] = useState<DigitalEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  // Fetch entities
  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listEntities(caseId);
        setEntities(response.entities || []);
      } catch (err) {
        setError(friendlyError(err, "Failed to fetch entities"));
      } finally {
        setLoading(false);
      }
    };
    fetchEntities();
  }, [caseId, refetchTrigger]);

  const extract = useCallback(
    async (sourceText: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await extractEntities(caseId, { source_text: sourceText });
        setEntities(response.entities || []);
        return response;
      } catch (err) {
        setError(friendlyError(err, "Failed to extract entities"));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [caseId]
  );

  const confirm = useCallback(
    async (id: string) => {
      // Optimistic update
      const originalEntities = [...entities];
      const updatedEntities = entities.map((e) =>
        e.id === id ? { ...e, status: "CONFIRMED" as const } : e
      );
      setEntities(updatedEntities);
      setError(null);

      try {
        const response = await updateEntityStatus(id, { status: "CONFIRMED" });
        setEntities((prev) =>
          prev.map((e) => (e.id === id ? response.entity : e))
        );
      } catch (err) {
        // Rollback on error
        setEntities(originalEntities);
        setError(friendlyError(err, "Failed to confirm entity"));
        throw err;
      }
    },
    [entities]
  );

  const reject = useCallback(
    async (id: string) => {
      // Optimistic update
      const originalEntities = [...entities];
      const updatedEntities = entities.map((e) =>
        e.id === id ? { ...e, status: "REJECTED" as const } : e
      );
      setEntities(updatedEntities);
      setError(null);

      try {
        const response = await updateEntityStatus(id, { status: "REJECTED" });
        setEntities((prev) =>
          prev.map((e) => (e.id === id ? response.entity : e))
        );
      } catch (err) {
        // Rollback on error
        setEntities(originalEntities);
        setError(friendlyError(err, "Failed to reject entity"));
        throw err;
      }
    },
    [entities]
  );

  return { entities, loading, error, refetch, extract, confirm, reject };
}

