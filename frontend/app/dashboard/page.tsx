"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  FileSearch,
  LogOut,
  Network,
  Plus,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Loader2,
  Scale,
  Sparkles,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ApiError, getDashboard, getPendingRequests, approveRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DashboardOut, LegalRequestOut } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SHO specific state
  const [pendingRequests, setPendingRequests] = useState<LegalRequestOut[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      try {
        setDashboard(await getDashboard());
      } catch (caught: unknown) {
        setError(caught instanceof ApiError ? caught.message : "Dashboard unavailable");
      }
    }
    if (user) {
      void load();
    }
  }, [user]);

  useEffect(() => {
    async function loadPending() {
      if (user?.role === "SHO") {
        setLoadingRequests(true);
        try {
          const res = await getPendingRequests();
          setPendingRequests(res);
        } catch (e) {
          console.error("Failed to load pending requests", e);
        } finally {
          setLoadingRequests(false);
        }
      }
    }
    if (user) {
      void loadPending();
    }
  }, [user]);

  const handleApprove = async (reqId: string) => {
    setApprovingId(reqId);
    try {
      await approveRequest(reqId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
      // Refresh dashboard stats
      setDashboard(await getDashboard());
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to approve request");
    } finally {
      setApprovingId(null);
    }
  };

  if (loading || !user) {
    return <main className="min-h-screen bg-background p-6 text-sm text-muted-foreground">Loading dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/70 p-6 grid-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Crime OS AI command dashboard</p>
            <h1 className="font-heading text-3xl font-bold md:text-4xl flex items-center gap-2">
              Investigation Workspace
              {user.role === "SHO" && (
                <span className="text-xs bg-accent/20 border border-accent/40 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  SHO Command Mode
                </span>
              )}
              {user.role === "LEGAL" && (
                <span className="text-xs bg-secondary/80 border border-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Legal Advisory Mode
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Logged in as <span className="text-foreground font-semibold">{user.full_name}</span>{" "}
              <span className="font-mono text-primary">({user.role})</span>
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === "IO" && (
              <Button
                id="new-case-btn"
                onClick={() => router.push("/cases")}
                className="transition-all duration-200 hover:scale-105 hover:glow-primary"
              >
                <Plus className="h-4 w-4" />
                Cases
              </Button>
            )}
            {user.role !== "IO" && (
              <Button
                variant="secondary"
                onClick={() => router.push("/cases")}
              >
                View Case Queue
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                signOut();
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        {error ? <div className="rounded-xl border border-destructive bg-destructive/10 p-5 text-sm">{error}</div> : null}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={FileSearch} label="Total cases in station" value={dashboard?.total_cases ?? 0} />
          <StatCard icon={Network} label="Awaiting SHO Approval" value={dashboard?.pending_requests ?? 0} />
          <StatCard icon={Activity} label="System audit logs" value={dashboard?.audit_events ?? 0} />
        </div>

        {/* SHO Approval Queue (visible only to SHO role) */}
        {user.role === "SHO" && (
          <Card className="glass border-accent/30 glow-primary animate-fade-up">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-accent">
                <Sparkles className="h-5 w-5 animate-pulse text-accent" />
                SHO Legal Requests Approval Queue
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review and authorize legal dispatch requests to telecom companies, banks, and platform services.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="py-6 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-sm text-muted-foreground">Loading pending requests...</span>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border/40 rounded-xl bg-background/20">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  No pending legal requests in queue.
                </div>
              ) : (
                <div className="divide-y divide-border/30 animate-fade-up">
                  {pendingRequests.map((req) => {
                    const isApproving = approvingId === req.id;
                    return (
                      <div key={req.id} className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between first:pt-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground uppercase px-2 py-0.5 rounded bg-secondary">
                              {req.provider_type}
                            </span>
                            <span className="font-mono text-xs text-primary">{req.provider_name}</span>
                          </div>
                          <h3 className="font-heading font-semibold text-foreground">
                            Legal Request Draft for Case ID {req.case_id.substring(0, 8)}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            Target Email: {req.recipient_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/cases/${req.case_id}/requests`)}
                            className="text-xs h-8"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Review Draft
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleApprove(req.id)}
                            disabled={isApproving}
                            className="text-xs h-8 bg-success hover:glow-success border-0 text-success-foreground"
                          >
                            {isApproving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legal Advisor section review queue (visible only to LEGAL role) */}
        {user.role === "LEGAL" && (
          <Card className="glass border-primary/30 glow-primary animate-fade-up">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5 text-primary" />
                Legal Citation Auditing Dashboard
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review, verify, or update recommended BNS/BNSS/BSA criminal charges for active cases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-2 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  As the Station Legal Advisor, your role is to verify the legal section recommendations generated by Crime OS AI. 
                  Below are the cases currently listed in the station. Select a case to audit its suggested charges.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Case Queue Section (Active cases) */}
        <Card className="animate-fade-up">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <CardTitle>Active cases queue</CardTitle>
                <CardDescription>Current station case registry</CardDescription>
              </div>
              {user.role === "IO" && (
                <Button variant="secondary" size="sm" onClick={() => router.push("/cases")}>
                  View Registry
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="flex flex-col gap-3 p-6 pt-0">
            {(dashboard?.active_cases ?? []).length === 0 ? (
              <div className="rounded-xl border bg-muted p-5 text-sm text-muted-foreground">No cases registered yet.</div>
            ) : (
              dashboard?.active_cases.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (user.role === "LEGAL") {
                      // Redirect Legal Advisor straight to legal sections review tab
                      router.push(`/cases/${item.id}/path`);
                    } else if (user.role === "SHO") {
                      // Redirect SHO to requests or summary review
                      router.push(`/cases/${item.id}/summary`);
                    } else {
                      router.push(`/cases/${item.id}`);
                    }
                  }}
                  className="w-full text-left flex flex-col gap-3 rounded-xl border bg-secondary p-4 transition-all duration-200 hover:border-primary/50 hover:glow-primary hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-mono text-sm text-primary">{item.case_number}</p>
                      {user.role === "LEGAL" && (
                        <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-mono uppercase">
                          Awaiting Audit
                        </span>
                      )}
                    </div>
                    <h2 className="font-heading text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">{item.crime_type ?? "Awaiting classification"}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(item.created_at).toLocaleDateString("en-IN")}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="glass animate-fade-up p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-mono text-3xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-primary opacity-80" />
      </div>
    </Card>
  );
}
