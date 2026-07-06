"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch,
  Mail,
  Send,
  CheckCircle,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getRequests,
  createRequest,
  updateRequest,
  approveRequest,
  dispatchRequest,
  triggerMockResponse,
  ApiError,
} from "@/lib/api";
import type { LegalRequestOut, ProviderType } from "@/lib/types";

const PROVIDER_DEFAULTS = {
  telecom: {
    name: "Bharti Airtel",
    email: "nodal.officer@airtel.com",
  },
  bank: {
    name: "State Bank of India",
    email: "nodal.sbi@sbi.co.in",
  },
  platform: {
    name: "Instagram (Meta Inc.)",
    email: "law-enforcement@instagram.com",
  },
};

export default function RequestsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.id as string;

  const stepIdParam = searchParams.get("step_id");
  const providerTypeParam = searchParams.get("provider_type") as ProviderType | null;

  // Requests state
  const [requests, setRequests] = useState<LegalRequestOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [creating, setCreating] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  // Edit / Preview Dialog state
  const [selectedRequest, setSelectedRequest] = useState<LegalRequestOut | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Mutation loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      void loadRequests();
    }
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
      // Clear query params and reload
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
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update draft");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleApprove(reqId: string) {
    setActionLoading(reqId);
    try {
      const updated = await approveRequest(reqId);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDispatch(reqId: string) {
    setActionLoading(reqId);
    try {
      const updated = await dispatchRequest(reqId);
      setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to dispatch request");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTriggerMockResponse(reqId: string) {
    setActionLoading(reqId);
    try {
      await triggerMockResponse(reqId);
      // Reload everything to get updated request status
      await loadRequests();
      // Redirect to responses
      router.push(`/cases/${caseId}/responses`);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to trigger response");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Draft Creator Form (Visible if redirected from stepper) */}
      {stepIdParam && providerTypeParam && (
        <Card className="glass border-primary/40 glow-primary">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Generate {providerTypeParam.toUpperCase()} Request Draft
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              LERS-style legal request templates pre-populated with case details and extracted suspect entities.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateDraft}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="provider_name">Nodal Provider / Institution Name</Label>
                  <Input
                    id="provider_name"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g. Bharti Airtel, HDFC Bank, Telegram Inc."
                    className="bg-input border-border/40 focus:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recipient_email">Nodal Officer Email Address</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. nodal@airtel.com, legal@sbi.co.in"
                    className="bg-input border-border/40 focus:ring-primary"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                * Note: In demo mode, emails will be routed to your demo inbox setting (
                <span className="font-mono text-primary">vrajv83@gmail.com</span>
                ) to preserve system sandboxing, while displaying target provider details in logs.
              </p>
            </CardContent>
            <div className="flex justify-end gap-2 pt-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.replace(`/cases/${caseId}/requests`)}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-primary hover:scale-105 transition-all">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Draft...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Draft
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mt-12" />
          <p className="text-center text-sm text-muted-foreground">Loading legal requests...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="font-heading text-lg font-semibold text-destructive">Error Loading Data</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={loadRequests} variant="secondary" className="border-destructive/30 hover:bg-destructive/10">
            Retry
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border p-16 text-center grid-bg">
          <div className="rounded-full bg-primary/10 p-4">
            <FileSearch className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">No Legal Requests Generated</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Use the <span className="text-primary font-medium">Investigation Path</span> tab to trigger automatic LERS request drafting for this case.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Legal Requests Timeline ({requests.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {requests.map((req) => {
              const isLoading = actionLoading === req.id;

              return (
                <Card key={req.id} className="border border-border/80 bg-card/60 relative overflow-hidden transition-all duration-200 hover:border-primary/20">
                  {/* Subtle side glow for active/important statuses */}
                  {req.status === "dispatched" && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary animate-pulse" />
                  )}
                  {req.status === "responded" && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-success" />
                  )}

                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground uppercase px-2 py-0.5 rounded bg-secondary">
                          {req.provider_type}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <CardTitle className="font-heading text-lg font-bold">
                        Request to {req.provider_name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Mail className="h-3 w-3" /> {req.recipient_email}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    {/* Status timeline details */}
                    <div className="bg-background/40 border border-border/30 rounded-lg p-3 space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Template:</span>
                        <span>{req.template_used}</span>
                      </div>
                      {req.dispatched_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dispatched At:</span>
                          <span>
                            {new Date(req.dispatched_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <div className="flex justify-between border-t border-border/30 pt-4 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditDialog(req)}
                        className="text-xs h-8 px-3 border-border"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        {req.status === "draft" ? "Edit Draft" : "View Template"}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleApprove(req.id)}
                            disabled={isLoading}
                            className="text-xs h-8 px-3"
                          >
                            {isLoading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleDispatch(req.id)}
                            disabled={isLoading}
                            className="text-xs h-8 px-3 bg-primary"
                          >
                            {isLoading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Dispatch
                          </Button>
                        </>
                      )}

                      {req.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => void handleDispatch(req.id)}
                          disabled={isLoading}
                          className="text-xs h-8 px-3 bg-primary"
                        >
                          {isLoading ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Dispatch Request
                        </Button>
                      )}

                      {req.status === "dispatched" && (
                        <Button
                          size="sm"
                          onClick={() => void handleTriggerMockResponse(req.id)}
                          disabled={isLoading}
                          className="text-xs h-8 px-3 bg-success hover:scale-105 transition-all glow-success border-0"
                        >
                          {isLoading ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                          )}
                          Trigger Mock Response
                        </Button>
                      )}

                      {req.status === "responded" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/cases/${caseId}/responses`)}
                          className="text-xs h-8 px-3 text-success hover:text-success hover:bg-success/15 gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Response Received
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview / Edit Dialog */}
      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="glass max-w-2xl text-foreground">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedRequest?.status === "draft" ? "Edit Legal Request Draft" : "View Dispatched Legal Request"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Preview and modify LERS-style letter content, target recipient email, and provider institution metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_provider_name">Nodal Institution</Label>
                <Input
                  id="edit_provider_name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={selectedRequest?.status !== "draft"}
                  className="bg-input border-border/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_recipient_email">Nodal Email</Label>
                <Input
                  id="edit_recipient_email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={selectedRequest?.status !== "draft"}
                  className="bg-input border-border/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_body">Draft Body</Label>
              <textarea
                id="edit_body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={selectedRequest?.status !== "draft"}
                rows={12}
                className="flex w-full rounded-md border border-border/40 bg-input px-3 py-2 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-80"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedRequest(null)} className="text-muted-foreground">
              Close
            </Button>
            {selectedRequest?.status === "draft" && (
              <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-primary">
                {savingEdit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
