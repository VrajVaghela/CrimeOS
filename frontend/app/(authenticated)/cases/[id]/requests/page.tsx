"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch,
  Mail,
  Send,
  CheckCircle,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getRequests,
  createRequest,
  updateRequest,
  approveRequest,
  dispatchRequest,
  triggerMockResponse,
  getRequestReadiness,
  ApiError,
} from "@/lib/api";
import { RequestReadinessChecklist } from "@/components/request-readiness-checklist";
import { useAuth } from "@/lib/auth-context";
import { useEnumLabel } from "@/lib/i18n/enums";
import { interpolate, useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import type { LegalRequestOut, ProviderType, RequestReadinessOut } from "@/lib/types";

const PROVIDER_DEFAULTS = {
  telecom: { name: "Bharti Airtel", email: "nodal.officer@airtel.com" },
  bank: { name: "State Bank of India", email: "nodal.sbi@sbi.co.in" },
  platform: { name: "Instagram (Meta Inc.)", email: "law-enforcement@instagram.com" },
};

export default function RequestsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { label: enumLabel } = useEnumLabel();
  const { formatDateTime } = useFormatters();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.id as string;

  const stepIdParam = searchParams.get("step_id");
  const providerTypeParam = searchParams.get("provider_type") as ProviderType | null;

  const [requests, setRequests] = useState<LegalRequestOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<LegalRequestOut | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [readinessMap, setReadinessMap] = useState<Record<string, RequestReadinessOut>>({});

  useEffect(() => {
    if (caseId) void loadRequests();
  }, [caseId]);

  useEffect(() => {
    if (providerTypeParam && PROVIDER_DEFAULTS[providerTypeParam]) {
      setProviderName(PROVIDER_DEFAULTS[providerTypeParam].name);
      setRecipientEmail(PROVIDER_DEFAULTS[providerTypeParam].email);
    }
  }, [providerTypeParam]);

  async function loadRequests() {
    setLoading(true);
    setError(null);
    try {
      const data = await getRequests(caseId);
      setRequests(data);

      const readinessData: Record<string, RequestReadinessOut> = {};
      await Promise.all(
        data
          .filter((r) => r.status === "draft" || r.status === "approved")
          .map(async (r) => {
            try {
              const read = await getRequestReadiness(r.id);
              readinessData[r.id] = read;
            } catch (err) {
              console.error("Failed to load readiness for request", r.id, err);
            }
          })
      );
      setReadinessMap(readinessData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }


  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!providerName || !recipientEmail) return;
    setCreating(true);
    setError(null);
    try {
      await createRequest({
        case_id: caseId,
        path_step_id: stepIdParam,
        provider_name: providerName,
        recipient_email: recipientEmail,
      });
      router.replace(`/cases/${caseId}/requests`);
      setProviderName("");
      setRecipientEmail("");
      await loadRequests();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create draft request");
    } finally {
      setCreating(false);
    }
  }

  function openEditDialog(req: LegalRequestOut) {
    setSelectedRequest(req);
    setEditBody(req.generated_body);
    setEditName(req.provider_name);
    setEditEmail(req.recipient_email);
  }

  async function handleSaveEdit() {
    if (!selectedRequest) return;
    setSavingEdit(true);
    try {
      const updated = await updateRequest(selectedRequest.id, {
        generated_body: editBody,
        provider_name: editName,
        recipient_email: editEmail,
      });
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedRequest(null);
      await loadRequests();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update draft");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleApprove(reqId: string) {
    setActionLoading(reqId);
    try {
      const updated = await approveRequest(reqId);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      await loadRequests();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDispatch(reqId: string) {
    setActionLoading(reqId);
    try {
      const updated = await dispatchRequest(reqId);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      await loadRequests();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to dispatch request");
    } finally {
      setActionLoading(null);
    }
  }


  async function handleTriggerMockResponse(reqId: string) {
    setActionLoading(reqId);
    try {
      await triggerMockResponse(reqId);
      await loadRequests();
      router.push(`/cases/${caseId}/responses`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to trigger response");
    } finally {
      setActionLoading(null);
    }
  }

  /** Only an IO may edit, and only while the request is still a draft. */
  const isReadOnlyDraft = selectedRequest?.status !== "draft" || user?.role !== "IO";

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      {/* Draft Creator Form */}
      {stepIdParam && providerTypeParam && (
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 shrink-0 text-info" />
                {interpolate(t("requests.generate_draft"), {
                  provider: providerTypeParam.toUpperCase(),
                })}
              </CardTitle>
              <CardDescription>{t("requests.subtitle")}</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleCreateDraft}>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="provider_name" required>
                    {t("requests.provider_name")}
                  </Label>
                  <Input
                    id="provider_name"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder={t("requests.provider_name_placeholder")}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recipient_email" required>
                    {t("requests.provider_email")}
                  </Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder={t("requests.provider_email_placeholder")}
                    required
                  />
                </div>
              </div>
              <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
                {t("requests.demo_note")}
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.replace(`/cases/${caseId}/requests`)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={creating} loading={creating}>
                {!creating && <FileText className="h-4 w-4" />}
                {t("requests.generate_btn")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56 rounded-squircle" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title={t("requests.load_error")}
          description={error}
          action={{ label: t("common.retry"), onClick: loadRequests }}
        />
      ) : requests.length === 0 && !stepIdParam ? (
        <EmptyState
          icon={FileSearch}
          title={t("requests.no_requests")}
          description={t("requests.no_requests_sub")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <PageHeader
            level="section"
            title={
              <span className="flex items-baseline gap-2">
                {t("requests.title")}
                <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
                  {requests.length}
                </span>
              </span>
            }
          />

          <div className="grid grid-cols-1 gap-4">
            {requests.map((req) => {
              const isLoading = actionLoading === req.id;
              return (
                <Card
                  key={req.id}
                  className={
                    req.status === "responded"
                      ? "border-success/30"
                      : req.status === "dispatched"
                        ? "border-primary/30"
                        : undefined
                  }
                >

                  <CardHeader>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        {/* Provider type is a fact, not a status: one neutral
                            treatment for all three, so the StatusBadge beside it
                            is the only coloured thing in the row. */}
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {enumLabel("provider", req.provider_type)}
                        </Badge>
                        <StatusBadge status={req.status} />
                      </div>
                      <CardTitle className="text-base">
                        {interpolate(t("requests.request_to"), { provider: req.provider_name })}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1.5 font-mono text-xs">
                        <Mail className="h-3 w-3 shrink-0" />
                        {req.recipient_email}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    {/* A compact pair list, not a full-width justify-between row:
                        stretching "Template: lers_bank_v3" across the whole card
                        read as a broken table. */}
                    <dl className="flex flex-wrap gap-x-6 gap-y-1.5 rounded-squircle-sm border border-border/60 bg-surface-alt px-3 py-2.5 font-mono text-xs">
                      <div className="flex items-baseline gap-2">
                        <dt className="text-muted-foreground">{t("requests.template_label")}</dt>
                        <dd className="text-foreground">{req.template_used}</dd>
                      </div>
                      {req.dispatched_at && (
                        <div className="flex items-baseline gap-2">
                          <dt className="text-muted-foreground">
                            {t("requests.dispatched_label")}
                          </dt>
                          <dd className="text-foreground">{formatDateTime(req.dispatched_at)}</dd>
                        </div>
                      )}
                    </dl>

                    {readinessMap[req.id] && (
                      <RequestReadinessChecklist
                        readiness={readinessMap[req.id]}
                        onEditClick={() => openEditDialog(req)}
                        onRoleApprovalClick={() => void handleApprove(req.id)}
                      />
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(req)}>
                      <FileText className="h-3.5 w-3.5" />
                      {req.status === "draft" && user?.role === "IO"
                        ? t("requests.edit_draft")
                        : req.status === "draft"
                          ? t("requests.view_draft")
                          : t("requests.view_template")}
                    </Button>

                    <div className="flex items-center gap-2">
                      {req.status === "draft" &&
                        (user?.role === "SHO" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleApprove(req.id)}
                            disabled={
                              isLoading ||
                              (readinessMap[req.id] &&
                                readinessMap[req.id].items.some(
                                  (it) => it.key !== "approval" && it.status === "failed",
                                ))
                            }
                            loading={isLoading}
                          >
                            {!isLoading && <UserCheck className="h-3.5 w-3.5" />}
                            {t("requests.approve")}
                          </Button>
                        ) : (
                          <span className="rounded-squircle-sm border border-warn/30 bg-warn/10 px-2.5 py-1 font-mono text-xs font-medium text-warn">
                            {t("requests.awaiting_sho")}
                          </span>
                        ))}

                      {req.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => void handleDispatch(req.id)}
                          disabled={isLoading || !readinessMap[req.id]?.is_ready}
                          loading={isLoading}
                        >
                          {!isLoading && <Send className="h-3.5 w-3.5" />}
                          {t("requests.dispatch")}
                        </Button>
                      )}

                      {req.status === "dispatched" && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => void handleTriggerMockResponse(req.id)}
                          disabled={isLoading}
                          loading={isLoading}
                        >
                          {!isLoading && <Sparkles className="h-3.5 w-3.5" />}
                          {t("requests.trigger_mock")}
                        </Button>
                      )}

                      {req.status === "responded" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/cases/${caseId}/responses`)}
                          className="text-success hover:bg-success/10 hover:text-success"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t("requests.received")}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview / Edit Dialog */}
      <Dialog
        open={selectedRequest !== null}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold">
              {selectedRequest?.status === "draft"
                ? t("requests.edit_dialog_title")
                : t("requests.view_dialog_title")}
            </DialogTitle>
            <DialogDescription>{t("requests.dialog_subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_provider_name">{t("requests.nodal_institution")}</Label>
                <Input
                  id="edit_provider_name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isReadOnlyDraft}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_recipient_email">{t("requests.nodal_email")}</Label>
                <Input
                  id="edit_recipient_email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={isReadOnlyDraft}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_body">{t("requests.draft_body")}</Label>
              <Textarea
                id="edit_body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={isReadOnlyDraft}
                rows={12}
                className="font-mono leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>
              {t("common.close")}
            </Button>
            {!isReadOnlyDraft && (
              <Button onClick={handleSaveEdit} disabled={savingEdit} loading={savingEdit}>
                {t("requests.save_changes")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
