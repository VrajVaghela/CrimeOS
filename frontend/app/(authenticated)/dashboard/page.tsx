"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  FileSearch,
  Network,
  Plus,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Loader2,
  Scale,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Gavel,
  Shield,
  Users,
  Database,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ApiError, getDashboard, getPendingRequests, approveRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import type { DashboardOut, LegalRequestOut } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { formatDate } = useFormatters();
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingRequests, setPendingRequests] = useState<LegalRequestOut[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, router, user]);

  useEffect(() => {
    async function load() {
      try {
        setDashboard(await getDashboard());
      } catch (caught: unknown) {
        setError(caught instanceof ApiError ? caught.message : "Dashboard unavailable");
      }
    }
    if (user) void load();
  }, [user]);

  useEffect(() => {
    async function loadPending() {
      if (user?.role === "SHO") {
        setLoadingRequests(true);
        try {
          const res = await getPendingRequests();
          setPendingRequests(res);
        } catch (caught: unknown) {
          setError(caught instanceof ApiError ? caught.message : "Approval queue unavailable");
        } finally {
          setLoadingRequests(false);
        }
      }
    }
    if (user) void loadPending();
  }, [user]);

  const handleApprove = async (reqId: string) => {
    setApprovingId(reqId);
    try {
      await approveRequest(reqId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
      setDashboard(await getDashboard());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to approve request");
    } finally {
      setApprovingId(null);
    }
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("dashboard.subtitle" as any) || "Station workspace"}
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl flex items-center gap-3 flex-wrap">
            {t("dashboard.title" as any) || "Investigation Workspace"}
            {user.role === "SHO" && (
              <span className="text-[10px] bg-accent/15 border border-accent/30 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-normal">
                <Shield className="h-3 w-3 inline mr-1" />
                {t("dashboard.role_sho" as any) || "SHO Command Mode"}
              </span>
            )}
            {user.role === "LEGAL" && (
              <span className="text-[10px] bg-info/10 border border-info/30 text-info px-2 py-0.5 rounded-squircle-sm uppercase tracking-wider font-mono font-normal flex items-center gap-1">
                <Scale className="h-3 w-3" /> {t("dashboard.role_legal" as any) || "Legal Advisory Mode"}
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("dashboard.logged_in_as" as any) || "Logged in as"}{" "}
            <span className="text-foreground font-semibold">{user.full_name}</span>{" "}
            <span className="font-mono text-info text-[10px]">({user.role})</span>
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-6">
        {error ? (
          <div className="animate-fade-down rounded-xl border border-rose/30 bg-rose/10 p-5 text-sm text-rose flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {/* Dashboard Stats — Each with a distinct color */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={FileSearch} label={t("dashboard.stat_cases")} value={dashboard?.total_cases ?? 0} color="primary" delay="delay-100" />
          <StatCard icon={Network} label={t("dashboard.stat_pending")} value={dashboard?.pending_requests ?? 0} color="accent" delay="delay-200" />
          <StatCard icon={Activity} label={t("dashboard.stat_audit")} value={dashboard?.audit_events ?? 0} color="info" delay="delay-300" />
        </div>

        {/* SHO Approval Queue */}
        {user.role === "SHO" && (
          <Card hover className="animate-fade-up delay-200 relative overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-accent">
                  <Sparkles className="h-5 w-5 text-accent" />
                  {t("dashboard.sho_queue_title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("dashboard.sho_queue_subtitle")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="py-6 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-sm text-muted-foreground">{t("dashboard.loading_pending")}</span>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border/40 rounded-xl bg-success/5">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">{t("dashboard.sho_all_clear")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("dashboard.sho_all_clear_sub")}</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {pendingRequests.map((req, idx) => {
                    const isApproving = approvingId === req.id;
                    return (
                      <div
                        key={req.id}
                        className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-colors duration-150 hover:bg-primary/[0.02] rounded-lg px-2 -mx-2 animate-fade-up"
                        style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase px-2 py-0.5 rounded bg-secondary border border-border/40">
                              {req.provider_type}
                            </span>
                            <span className="font-mono text-xs text-info">{req.provider_name}</span>
                          </div>
                          <h3 className="font-heading font-semibold text-foreground text-sm">
                            {t("cases.legal_request_for")} {req.case_id.substring(0, 8)}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            Target: {req.recipient_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/cases/${req.case_id}/requests`)}>
                            <FileText className="h-3.5 w-3.5" />
                            {t("common.review_draft")}
                          </Button>
                          <Button size="sm" variant="success" onClick={() => void handleApprove(req.id)} disabled={isApproving} loading={isApproving}>
                            {!isApproving && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {t("common.approve")}
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

        {/* Legal Advisor section */}
        {user.role === "LEGAL" && (
          <Card hover className="animate-fade-up delay-300 relative overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-violet">
                  <Scale className="h-5 w-5 text-violet" />
                  {t("dashboard.legal_title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("dashboard.legal_subtitle")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="py-2 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("dashboard.legal_body")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Cases Queue */}
        <Card className="animate-fade-up delay-300">
          <CardHeader>
            <div>
              <CardTitle>{t("dashboard.cases_title")}</CardTitle>
              <CardDescription>{t("dashboard.cases_subtitle")}</CardDescription>
            </div>
            {user.role === "IO" && (
              <Button variant="secondary" size="sm" onClick={() => router.push("/cases")}>
                {t("common.view_registry")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>
          <div className="flex flex-col gap-3 px-5 pb-5">
            {(dashboard?.active_cases ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 bg-surface-alt/50 p-8 text-center">
                <FileSearch className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{t("dashboard.cases_empty")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.cases_empty_sub")}</p>
              </div>
            ) : (
              dashboard?.active_cases.map((item, idx) => {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (user.role === "LEGAL") router.push(`/cases/${item.id}/path`);
                      else if (user.role === "SHO") router.push(`/cases/${item.id}/summary`);
                      else router.push(`/cases/${item.id}`);
                    }}
                            className="w-full text-left flex flex-col gap-3 rounded-squircle border border-border/60 bg-card p-4 transition-colors duration-200 hover:border-primary/40 md:flex-row md:items-center md:justify-between animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}

                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-mono text-sm text-accent-strong">{item.case_number}</p>
                        {user.role === "LEGAL" && (
                          <span className="text-[10px] bg-violet/10 border border-violet/20 text-violet px-1.5 py-0.5 rounded font-mono uppercase">
                            {t("dashboard.awaiting_audit")}
                          </span>
                        )}
                      </div>
                      <h2 className="font-heading text-lg font-semibold truncate">{item.title}</h2>
                      <p className="text-sm text-muted-foreground">{item.crime_type ?? t("dashboard.awaiting_classification")}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(item.created_at)}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}

const STAT_COLORS = {
  primary: { bg: "bg-secondary border-border", icon: "text-primary", glow: "" },
  accent: { bg: "bg-secondary border-border", icon: "text-warn", glow: "" },
  info: { bg: "bg-secondary border-border", icon: "text-info", glow: "" },
  violet: { bg: "bg-secondary border-border", icon: "text-info", glow: "" },
  rose: { bg: "bg-secondary border-border", icon: "text-destructive", glow: "" },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
  delay = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color?: keyof typeof STAT_COLORS;
  delay?: string;
}) {
  const c = STAT_COLORS[color];
  return (
    <Card hover className={["animate-fade-up", delay, c.glow].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-mono text-3xl font-bold mt-1 tracking-tight">{value}</p>
        </div>
        <div className={["rounded-xl p-3 border", c.bg].join(" ")}>
          <Icon className={["h-6 w-6", c.icon].join(" ")} />
        </div>
      </div>
    </Card>
  );
}
