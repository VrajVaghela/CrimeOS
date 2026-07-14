import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listLegalRequestsByStatus } from "../api/dispatch";
import {
  listCDRRecords,
  listIPSessionRecords,
  listBankTransactionRecords,
} from "../api/analytics";
import type { LegalRequest } from "../types/legalRequest";
import type { CDRRecord, IPSessionRecord, BankTransactionRecord } from "../types/analytics";
import { ResponseUploadForm } from "../components/ResponseUploadForm";
import { RecordTable } from "../components/RecordTable";
import { IntelligenceFlagPanel } from "../components/IntelligenceFlagPanel";
import { CaseNav } from "../components/CaseNav";

const UPLOAD_ELIGIBLE_STATUSES = new Set([
  "SENT",
  "ACKNOWLEDGED",
  "RESPONDED",
]);

export default function AnalyticsDashboard() {
  const { caseId } = useParams<{ caseId: string }>();
  const [requests, setRequests] = useState<LegalRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [recordsKey, setRecordsKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!caseId) return;
      setLoading(true);
      try {
        const res = await listLegalRequestsByStatus(caseId);
        setRequests(res.legal_requests || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [caseId]);

  const eligibleRequests = useMemo(
    () => requests.filter((r) => UPLOAD_ELIGIBLE_STATUSES.has(r.status)),
    [requests]
  );

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId),
    [requests, selectedRequestId]
  );

  useEffect(() => {
    if (eligibleRequests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(eligibleRequests[0].id);
    }
  }, [eligibleRequests, selectedRequestId]);

  const fetchCdrPage = useCallback(
    async (page: number, limit: number) => {
      if (!selectedRequestId) return { records: [], total: 0 };
      return listCDRRecords(selectedRequestId, { page, limit });
    },
    [selectedRequestId]
  );

  const fetchIpPage = useCallback(
    async (page: number, limit: number) => {
      if (!selectedRequestId) return { records: [], total: 0 };
      return listIPSessionRecords(selectedRequestId, { page, limit });
    },
    [selectedRequestId]
  );

  const fetchBankPage = useCallback(
    async (page: number, limit: number) => {
      if (!selectedRequestId) return { records: [], total: 0 };
      return listBankTransactionRecords(selectedRequestId, { page, limit });
    },
    [selectedRequestId]
  );

  const cdrColumns = useMemo(
    () => [
      { key: "caller", header: "Caller", render: (r: CDRRecord) => r.caller_number },
      { key: "callee", header: "Callee", render: (r: CDRRecord) => r.callee_number },
      { key: "type", header: "Type", render: (r: CDRRecord) => r.call_type },
      { key: "start", header: "Start", render: (r: CDRRecord) => r.call_start },
      { key: "duration", header: "Duration (s)", render: (r: CDRRecord) => r.duration_seconds },
      { key: "tower", header: "Tower", render: (r: CDRRecord) => r.cell_tower_id ?? "—" },
    ],
    []
  );

  const ipColumns = useMemo(
    () => [
      { key: "ip", header: "IP Address", render: (r: IPSessionRecord) => r.ip_address },
      { key: "account", header: "Account", render: (r: IPSessionRecord) => r.account_identifier },
      { key: "start", header: "Session Start", render: (r: IPSessionRecord) => r.session_start ?? "—" },
      { key: "end", header: "Session End", render: (r: IPSessionRecord) => r.session_end ?? "—" },
      { key: "port", header: "Port", render: (r: IPSessionRecord) => r.port_number ?? "—" },
    ],
    []
  );

  const bankColumns = useMemo(
    () => [
      { key: "ref", header: "Txn Ref", render: (r: BankTransactionRecord) => r.txn_ref },
      { key: "date", header: "Date", render: (r: BankTransactionRecord) => r.txn_date },
      { key: "amount", header: "Amount", render: (r: BankTransactionRecord) => r.amount },
      { key: "type", header: "Type", render: (r: BankTransactionRecord) => r.txn_type },
      { key: "upi", header: "Counterparty UPI", render: (r: BankTransactionRecord) => r.counterparty_upi ?? "—" },
      { key: "narration", header: "Narration", render: (r: BankTransactionRecord) => r.narration ?? "—" },
    ],
    []
  );

  const renderRecordTable = () => {
    if (!selectedRequest) return null;

    switch (selectedRequest.template_type) {
      case "CDR_REQUEST":
        return (
          <RecordTable
            key={`cdr-${selectedRequestId}-${recordsKey}`}
            columns={cdrColumns}
            fetchPage={fetchCdrPage}
            rowKey={(r) => r.id}
            emptyMessage="No CDR records parsed yet."
          />
        );
      case "IP_LOG_REQUEST":
      case "SUBSCRIBER_DETAILS_REQUEST":
        return (
          <RecordTable
            key={`ip-${selectedRequestId}-${recordsKey}`}
            columns={ipColumns}
            fetchPage={fetchIpPage}
            rowKey={(r) => r.id}
            emptyMessage="No IP session records parsed yet."
          />
        );
      case "BANK_STATEMENT_REQUEST":
      case "KYC_REQUEST":
      case "ACCOUNT_FREEZE_REQUEST":
        return (
          <RecordTable
            key={`bank-${selectedRequestId}-${recordsKey}`}
            columns={bankColumns}
            fetchPage={fetchBankPage}
            rowKey={(r) => r.id}
            emptyMessage="No bank transaction records parsed yet."
          />
        );
      default:
        return (
          <p className="text-gray-500 text-sm">
            No record table configured for {selectedRequest.template_type}.
          </p>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">Response Analytics</h1>
      <CaseNav />

      {loading ? (
        <div className="animate-pulse h-24 bg-gray-100 rounded mb-6" />
      ) : eligibleRequests.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-6">
          <p className="text-yellow-800 text-sm">
            No dispatched legal requests available for upload. Approve and
            dispatch a request first (status must be SENT, ACKNOWLEDGED, or
            RESPONDED).
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label htmlFor="request-select" className="block text-sm font-medium mb-1">
              Legal Request
            </label>
            <select
              id="request-select"
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full max-w-md border rounded px-3 py-2"
            >
              {eligibleRequests.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.request_number} — {req.template_type} ({req.status})
                </option>
              ))}
            </select>
          </div>

          {selectedRequestId && (
            <div className="mb-8">
              <ResponseUploadForm
                legalRequestId={selectedRequestId}
                onUploadComplete={() => setRecordsKey((k) => k + 1)}
              />
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Normalized Records</h2>
            {renderRecordTable()}
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Intelligence Flags</h2>
        <IntelligenceFlagPanel caseId={caseId!} />
      </div>
    </div>
  );
}
