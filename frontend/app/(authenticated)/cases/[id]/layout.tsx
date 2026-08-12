"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Globe,
  CheckCircle2,
  Crosshair,
  Mail,
  Activity,
  Camera,
  Radar,
  Network,
  Search,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, getCase, syncCctns } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, type TranslationKey } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import type { CaseDetailOut } from "@/lib/types";
import { CopilotLauncher } from "@/components/copilot-drawer";

/**
 * One flat strip in workflow order: the case itself, the work being done on it,
 * and the record it leaves behind. `group` only decides where a hairline divider
 * falls — the previous version printed "Work:" / "Evidence" / "Record" as inline
 * text, spending a third of a cramped rail on labels the tab names already imply.
 *
 * Tabs carry no per-tab accent colour. Nine differently tinted tabs read as nine
 * unrelated tools; one active mark reads as one workspace.
 */
const TABS = [
  { key: "overview", href: "", icon: Shield, group: "case" },
  { key: "ingestion", href: "ingestion", icon: Search, group: "work" },
  { key: "path", href: "path", icon: Crosshair, group: "work" },
  { key: "requests", href: "requests", icon: Mail, group: "work" },
  { key: "responses", href: "responses", icon: Activity, group: "work" },
  { key: "evidence", href: "evidence", icon: Camera, group: "record" },
  { key: "timeline", href: "timeline", icon: Clock, group: "record" },
  { key: "summary", href: "summary", icon: Radar, group: "record" },
  { key: "audit", href: "audit", icon: Network, group: "record" },
] as const;

export default function CaseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { formatDate } = useFormatters();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetailOut | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || !caseId) return;
    void load();
  }, [user, caseId]);

  async function load() {
    setFetching(true);
    setError(null);
    try {
      setCaseData(await getCase(caseId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load case");
    } finally {
      setFetching(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncCctns(caseId);
      setSyncDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Synchronization failed");
    } finally {
      setSyncing(false);
    }
  }

  const subPath = pathname.split(`/cases/${caseId}`)[1] || "";
  const routeSegment = subPath.split("/")[1] || "";
  const activeTab = TABS.find((tab) => tab.href === routeSegment)?.href ?? "";

  const syncPayload = caseData
    ? {
        cctns_header: {
          state: "Gujarat",
          district: "Ahmedabad City",
          police_station: "Cyber Crime PS",
          timestamp: new Date().toISOString(),
        },
        fir_details: {
          internal_case_no: caseData.case_number,
          title: caseData.title,
          crime_type: caseData.crime_type,
          registered_date: caseData.created_at,
        },
        complainant: caseData.complaints?.[0]
          ? {
              language: caseData.complaints[0].detected_language,
              original_text_preview: `${caseData.complaints[0].raw_text?.substring(0, 100)}...`,
            }
          : null,
        legal_citations: caseData.complaints?.[0]?.entities
          ? caseData.complaints[0].entities.map((e) => ({ type: e.entity_type, value: e.value }))
          : [],
      }
    : null;

  if (loading || !user) {
    return (
      <main className="min-w-0 flex-1 bg-background p-6">
        <Skeleton className="h-40 w-full rounded-squircle" />
      </main>
    );
  }

  return (
    <main className="min-w-0 flex-1 bg-background">
      {/* The case header scrolls away with the workspace rather than pinning:
          officers spend their time in the tab body, not the masthead. */}
      <header className="border-b border-border bg-toolbar">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cases")}
            className="-ml-3 mb-2 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nav.cases")}
          </Button>

          {fetching ? (
            <div className="flex flex-col gap-2 pb-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-80" />
            </div>
          ) : error ? (
            <p className="pb-5 text-sm text-destructive">{error}</p>
          ) : caseData ? (
            <div className="flex flex-col items-stretch gap-4 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    {caseData.case_number}
                  </span>
                  <StatusBadge status={caseData.status} />
                </div>
                <h1 className="break-words font-heading text-xl font-bold leading-tight tracking-[-0.02em] md:text-2xl">
                  {caseData.title}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {caseData.crime_type ?? t("dashboard.awaiting_classification")}
                  <span className="mx-1.5 text-muted-foreground/40">/</span>
                  <span className="font-mono">{formatDate(caseData.created_at)}</span>
                </p>
              </div>
              <div className="shrink-0 sm:pt-1">
                {caseData.status !== "synced" ? (
                  <Button
                    onClick={() => setSyncDialogOpen(true)}
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    id="sync-cctns-btn"
                  >
                    <Globe className="h-4 w-4" />
                    {t("common.sync_cctns")}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-squircle-sm border border-success/30 bg-success/10 px-3 py-1.5 font-mono text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("cases.cctns_synced")}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* The right-edge mask is the overflow affordance: with the rail's
              scrollbar hidden, a hard cut at the container edge reads as
              "nothing more here" and the Audit tab never gets found. */}
          <div className="relative -mx-4 sm:-mx-6">
            <nav
              className="rail-scroll flex items-stretch gap-1 px-4 sm:px-6"
              aria-label={t("cases.case_sections")}
            >
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.href;
                const startsGroup = index > 0 && TABS[index - 1].group !== tab.group;

                return (
                  <div key={tab.key} className="flex shrink-0 items-stretch">
                    {startsGroup ? (
                      <span aria-hidden="true" className="mx-2 my-2.5 w-px bg-border" />
                    ) : null}
                    <Link
                      href={tab.href ? `/cases/${caseId}/${tab.href}` : `/cases/${caseId}`}
                      id={`tab-${tab.href || "overview"}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-2 text-xs font-medium transition-colors duration-150 ${
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(`tab.${tab.key}` as TranslationKey)}
                      {/* The active mark is a full-contrast rule, not a red one.
                          The sidebar rail already spends the screen's red on
                          "you are in Cases"; a second red active indicator one
                          level down makes neither of them mean anything. */}
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-sm bg-foreground"
                        />
                      ) : null}
                    </Link>
                  </div>
                );
              })}
            </nav>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-toolbar to-transparent"
            />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</section>

      <CopilotLauncher caseId={caseId} />

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold">
              {t("cases.sync_dialog_title")}
            </DialogTitle>
            <DialogDescription>{t("cases.sync_dialog_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("cases.payload_preview")}{" "}
              <code className="font-mono text-info">POST /mock/cctns/sync</code>
            </p>
            <div className="max-h-64 overflow-y-auto rounded-squircle-sm border border-border/60 bg-surface-alt p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              <pre>{JSON.stringify(syncPayload, null, 2)}</pre>
            </div>
            <p className="rounded-squircle-sm border border-border bg-surface-alt px-3 py-2.5 text-xs leading-relaxed text-secondary-foreground">
              {t("cases.sync_dialog_effect")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSyncDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSync} disabled={syncing} loading={syncing}>
              {t("cases.confirm_sync")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
