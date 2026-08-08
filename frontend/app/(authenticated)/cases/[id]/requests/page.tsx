"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch,
  Mail,
  Send,
  CheckCircle,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
  X,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useLanguage } from "@/lib/language-context";
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

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Draft Creator Form */}
      {stepIdParam && providerTypeParam && (
        <Card hover className="animate-fade-down relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-info to-accent" />
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("requests.generate_draft").replace("{provider}", providerTypeParam.toUpperCase())}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              {t("requests.subtitle")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateDraft}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="provider_name">{t("requests.provider_name")}</Label>
                  <Input
                    id="provider_name"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g. Bharti Airtel, HDFC Bank, Telegram Inc."
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recipient_email">{t("requests.provider_email")}</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. nodal@airtel.com"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                * In demo mode, emails route to{" "}
                <span className="font-mono text-accent-strong">vrajv83@gmail.com</span> to preserve sandboxing,
                while displaying target provider details in logs.
              </p>
            </CardContent>
            <CardFooter className="border-t border-border/30 pt-4 flex justify-end gap-2">
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
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("requests.loading")}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center animate-fade-down">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="font-heading text-lg font-semibold text-destructive">{t("requests.load_error")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={loadRequests} variant="secondary">
            Retry
          </Button>
        </div>
      ) : requests.length === 0 && !stepIdParam ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border/60 p-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <FileSearch className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-heading font-semibold text-lg">{t("requests.no_requests")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("requests.no_requests_sub")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t("requests.title")}
              {requests.length > 0 && (
                <span className="text-sm font-mono text-muted-foreground font-normal">
                  ({requests.length})
                </span>
              )}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {requests.map((req, idx) => {
              const isLoading = actionLoading === req.id;
              return (
                <Card
                  key={req.id}
                  hover
                  className={[
                    "relative overflow-hidden",
                    req.status === "dispatched" ? "border-primary/30" : "",
                    req.status === "responded" ? "border-success/30" : "",
                    "animate-fade-up",
                  ].join(" ")}
                  style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                >
                  {/* Status indicator bar */}
                  {req.status === "dispatched" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary animate-pulse-glow" />
                  )}
                  {req.status === "responded" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-success" />
                  )}

                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={[
                          "font-mono text-[10px] uppercase px-2 py-0.5 rounded border font-semibold",
                          req.provider_type === "telecom"
                            ? "bg-info/15 text-info border-info/30"
                            : req.provider_type === "bank"
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-violet/15 text-violet border-violet/30"
                        ].join(" ")}>
                          {req.provider_type}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <CardTitle className="font-heading text-base font-bold">
                        Request to {req.provider_name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Mail className="h-3 w-3" /> {req.recipient_email}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div className="space-y-4">
                      <div className="bg-background/40 border border-border/40 rounded-lg p-3 space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("requests.template_label")}</span>
                          <span>{req.template_used}</span>
                        </div>
                        {req.dispatched_at && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("requests.dispatched_label")}</span>
                            <span>
                              {formatDateTime(req.dispatched_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      {readinessMap[req.id] && (
                        <div className="border-t border-border/40 pt-4">
                          <RequestReadinessChecklist
                            readiness={readinessMap[req.id]}
                            onEditClick={() => openEditDialog(req)}
                            onRoleApprovalClick={() => void handleApprove(req.id)}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(req)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {req.status === "draft" && user?.role === "IO" ? t("requests.edit_draft") : req.status === "draft" ? t("requests.view_draft") : t("requests.view_template")}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === "draft" && (
                        <>
                          {user?.role === "SHO" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleApprove(req.id)}
                              disabled={isLoading || (readinessMap[req.id] && readinessMap[req.id].items.some(it => it.key !== "approval" && it.status === "failed"))}
                              loading={isLoading}
                              className="text-accent border-accent/40 hover:bg-accent/10"
                            >
                              {!isLoading && <UserCheck className="h-3.5 w-3.5" />}
                              {t("requests.approve")}
                            </Button>
                          ) : (
                            <span className="text-xs text-accent font-semibold px-2.5 py-1 bg-accent/15 border border-accent/30 rounded font-mono">
                              {t("requests.awaiting_sho")}
                            </span>
                          )}
                        </>
                      )}

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
                          className="text-success hover:text-success hover:bg-success/10 gap-1"
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
      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedRequest?.status === "draft" ? t("requests.edit_dialog_title") : t("requests.view_dialog_title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {t("requests.dialog_subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_provider_name">{t("requests.nodal_institution")}</Label>
                <Input
                  id="edit_provider_name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={selectedRequest?.status !== "draft" || user?.role !== "IO"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_recipient_email">{t("requests.nodal_email")}</Label>
                <Input
                  id="edit_recipient_email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={selectedRequest?.status !== "draft" || user?.role !== "IO"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_body">{t("requests.draft_body")}</Label>
              <textarea
                id="edit_body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={selectedRequest?.status !== "draft" || user?.role !== "IO"}
                rows={12}
                className="flex w-full rounded-lg border border-border/60 bg-input px-3 py-2 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-80 transition-all"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
            {selectedRequest?.status === "draft" && user?.role === "IO" && (
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
