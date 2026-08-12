"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileText,
  Scale,
  Shield,
} from "lucide-react";

import { CaseList, CaseRow } from "@/components/case-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
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
        setError(caught instanceof ApiError ? caught.message : t("dashboard.load_error"));
      }
    }
    if (user) void load();
  }, [user]);

  useEffect(() => {
    async function loadPending() {
      if (user?.role === "SHO") {
        setLoadingRequests(true);
        try {
          setPendingRequests(await getPendingRequests());
        } catch (caught: unknown) {
          setError(caught instanceof ApiError ? caught.message : t("dashboard.queue_error"));
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
      setError(e instanceof ApiError ? e.message : t("dashboard.approve_error"));
    } finally {
      setApprovingId(null);
    }
  };

  if (loading || !user) {
    return (
      <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-28 rounded-squircle" />
          <Skeleton className="h-64 rounded-squircle" />
        </div>
      </main>
    );
  }

  const activeCases = dashboard?.active_cases ?? [];

  /** SHO and Legal land on the view where their decision is made, not the overview. */
  const caseEntryPath = (caseId: string) => {
    if (user.role === "LEGAL") return `/cases/${caseId}/path`;
    if (user.role === "SHO") return `/cases/${caseId}/summary`;
    return `/cases/${caseId}`;
  };

  return (
    <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl animate-fade-up flex-col gap-6">
        <PageHeader
          title={t("dashboard.title")}
          description={
            <>
              {t("dashboard.logged_in_as")}{" "}
              <span className="font-medium text-foreground">{user.full_name}</span>
              <span className="mx-1.5 text-muted-foreground/40">/</span>
              <span className="font-mono text-xs uppercase tracking-wide">{user.role}</span>
            </>
          }
          actions={
            <>
              {user.role === "SHO" && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 font-mono text-[10px] uppercase tracking-wide"
                >
                  <Shield className="h-3 w-3" />
                  {t("dashboard.role_sho")}
                </Badge>
              )}
              {user.role === "LEGAL" && (
                <Badge
                  variant="info"
                  className="gap-1.5 font-mono text-[10px] uppercase tracking-wide"
                >
                  <Scale className="h-3 w-3" />
                  {t("dashboard.role_legal")}
                </Badge>
              )}
              <Button variant="secondary" size="sm" onClick={() => router.push("/cases")}>
                {t("common.view_registry")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          }
        />

        {error ? (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <MetricStrip columns={3}>
          <Metric label={t("dashboard.stat_cases")} value={dashboard?.total_cases ?? 0} />
          <Metric
            label={t("dashboard.stat_pending")}
            value={dashboard?.pending_requests ?? 0}
            tone={(dashboard?.pending_requests ?? 0) > 0 ? "attention" : "default"}
          />
          <Metric label={t("dashboard.stat_audit")} value={dashboard?.audit_events ?? 0} />
        </MetricStrip>

        {user.role === "SHO" && (
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>{t("dashboard.sho_queue_title")}</CardTitle>
                <CardDescription>{t("dashboard.sho_queue_subtitle")}</CardDescription>
              </div>
            </CardHeader>

            {loadingRequests ? (
              <div className="flex flex-col gap-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-squircle-sm" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <EmptyState
                tone="success"
                icon={CheckCircle2}
                title={t("dashboard.sho_all_clear")}
                description={t("dashboard.sho_all_clear_sub")}
              />
            ) : (
              <ul className="-mx-5 divide-y divide-border/60 border-y border-border/60">
                {pendingRequests.map((req) => {
                  const isApproving = approvingId === req.id;
                  return (
                    <li
                      key={req.id}
                      className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {req.provider_type}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {req.provider_name}
                          </span>
                        </div>
                        <p className="font-heading text-sm font-semibold text-foreground">
                          {t("cases.legal_request_for")} {req.case_id.substring(0, 8)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          {t("cases.target")}: {req.recipient_email}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/cases/${req.case_id}/requests`)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {t("common.review_draft")}
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => void handleApprove(req.id)}
                          disabled={isApproving}
                          loading={isApproving}
                        >
                          {!isApproving && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t("common.approve")}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {user.role === "LEGAL" && (
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>{t("dashboard.legal_title")}</CardTitle>
                <CardDescription>{t("dashboard.legal_subtitle")}</CardDescription>
              </div>
            </CardHeader>
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              {t("dashboard.legal_body")}
            </p>
          </Card>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-heading text-lg font-semibold tracking-[-0.01em]">
              {t("dashboard.cases_title")}
            </h2>
            <span className="text-sm text-muted-foreground">{t("dashboard.cases_subtitle")}</span>
          </div>

          {activeCases.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title={t("dashboard.cases_empty")}
              description={t("dashboard.cases_empty_sub")}
              action={{ label: t("common.view_registry"), onClick: () => router.push("/cases") }}
            />
          ) : (
            <CaseList>
              {activeCases.map((item) => (
                <CaseRow
                  key={item.id}
                  caseNumber={item.case_number}
                  title={item.title}
                  classification={item.crime_type ?? t("dashboard.awaiting_classification")}
                  date={formatDate(item.created_at)}
                  status={item.status}
                  onSelect={() => router.push(caseEntryPath(item.id))}
                  marker={
                    user.role === "LEGAL" ? (
                      <Badge variant="info" className="font-mono text-[10px] uppercase">
                        {t("dashboard.awaiting_audit")}
                      </Badge>
                    ) : undefined
                  }
                />
              ))}
            </CaseList>
          )}
        </section>
      </div>
    </main>
  );
}
