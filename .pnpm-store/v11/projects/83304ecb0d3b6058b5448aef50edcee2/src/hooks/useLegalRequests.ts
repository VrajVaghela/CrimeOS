import { useState, useCallback, useEffect } from "react";
import type {
  LegalRequest,
  CreateLegalRequestRequest,
  ApproveLegalRequestRequest,
} from "../types/legalRequest";
import {
  createLegalRequest,
  approveLegalRequest,
} from "../api/legalRequests";
import { listLegalRequestsByStatus, dispatchLegalRequest } from "../api/dispatch";
import { friendlyError } from "../api/client";

export function useLegalRequests(caseId: string) {
  const [requests, setRequests] = useState<LegalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listLegalRequestsByStatus(caseId);
        setRequests(response.legal_requests || []);
      } catch (err) {
        setError(friendlyError(err, "Failed to fetch legal requests"));
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [caseId, refetchTrigger]);

  const create = useCallback(
    async (data: CreateLegalRequestRequest) => {
      setLoading(true);
      setError(null);
      try {
        const response = await createLegalRequest(caseId, data);
        setRequests((prev) => [response.legal_request, ...prev]);
        refetch();
        return response;
      } catch (err) {
        setError(friendlyError(err, "Failed to create legal request"));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [caseId, refetch]
  );

  const approve = useCallback(
    async (id: string, data: ApproveLegalRequestRequest) => {
      const originalRequests = [...requests];
      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: "QUEUED" } : req))
      );
      setError(null);
      try {
        const response = await approveLegalRequest(id, data);
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? response.legal_request : req))
        );
        return response;
      } catch (err) {
        setRequests(originalRequests);
        setError(friendlyError(err, "Failed to approve legal request"));
        throw err;
      }
    },
    [requests]
  );

  const dispatch = useCallback(
    async (id: string) => {
      const originalRequests = [...requests];
      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: "SENT" } : req))
      );
      setError(null);
      try {
        const response = await dispatchLegalRequest(id);
        refetch();
        return response;
      } catch (err) {
        setRequests(originalRequests);
        setError(friendlyError(err, "Failed to dispatch legal request"));
        throw err;
      }
    },
    [requests, refetch]
  );

  return {
    requests,
    loading,
    error,
    refetch,
    create,
    approve,
    dispatch,
  };
}
