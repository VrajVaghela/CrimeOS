"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Globe,
  CheckCircle2,
  Loader2,
  FileText,
  Crosshair,
  Mail,
  Activity,
  Camera,
  Radar,
  Network,
  Search,
  Sparkles,
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
import type { CaseDetailOut } from "@/lib/types";

const TABS = [
  { label: "Overview", href: "", icon: Shield, color: "text-primary border-primary", group: "Overview" },
  { label: "Ingestion", href: "ingestion", icon: Search, color: "text-info border-info", group: "Work" },
  { label: "Investigation", href: "path", icon: Crosshair, color: "text-violet border-violet", group: "Work" },
  { label: "Requests", href: "requests", icon: Mail, color: "text-accent border-accent", group: "Work" },
  { label: "Responses", href: "responses", icon: Activity, color: "text-success border-success", group: "Work" },
  { label: "Evidence", href: "evidence", icon: Camera, color: "text-primary border-primary", group: "Evidence" },
  { label: "Summary", href: "summary", icon: Radar, color: "text-info border-info", group: "Record" },
  { label: "Audit", href: "audit", icon: Network, color: "text-rose border-rose", group: "Record" },
] as const;


export default function CaseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
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
      alert(e instanceof ApiError ? e.message : "Synchronization failed");
    } finally {
      setSyncing(false);
    }
  }

  const activeTab = TABS.find((t) => t.href !== "" && pathname.includes(`/${t.href}`))?.href ?? "";
  const activeTabMeta = TABS.find((t) => t.href === activeTab);


  const syncPayload = caseData ? {
    cctns_header: { state: "Gujarat", district: "Ahmedabad City", police_station: "Cyber Crime PS", timestamp: new Date().toISOString() },
    fir_details: { internal_case_no: caseData.case_number, title: caseData.title, crime_type: caseData.crime_type, registered_date: caseData.created_at },
    complainant: caseData.complaints?.[0] ? { language: caseData.complaints[0].detected_language, original_text_preview: caseData.complaints[0].raw_text?.substring(0, 100) + "..." } : null,
    legal_citations: caseData.complaints?.[0]?.entities ? caseData.complaints[0].entities.map((e) => ({ type: e.entity_type, value: e.value })) : [],
  } : null;

  if (loading || !user) {
    return <main className="min-h-screen bg-background p-6"><Skeleton className="h-40 w-full rounded-xl" /></main>;
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Glass Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-surface-alt/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-alt/60">
        <div className="mx-auto max-w-7xl px-6 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/cases")} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Cases
            </Button>
          </div>

          {fetching ? (
            <div className="flex flex-col gap-2 pb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-80" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose pb-4">{error}</p>
          ) : caseData ? (
            <div className="flex items-start justify-between gap-4 pb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {activeTabMeta && (
                    <span className={["text-xs font-mono uppercase tracking-wider", activeTabMeta.color.split(" ")[0]].join(" ")}>
                      {activeTabMeta.label}
                    </span>
                  )}
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-mono text-sm text-primary">{caseData.case_number}</span>
                  <StatusBadge status={caseData.status} />
                </div>
                <h1 className="font-heading text-xl font-bold md:text-2xl truncate">{caseData.title}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {caseData.crime_type ?? "Awaiting classification"}
                  <span className="font-mono mx-1.5">·</span>
                  {new Date(caseData.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="shrink-0">
                {caseData.status !== "synced" ? (
                  <Button onClick={() => setSyncDialogOpen(true)} size="sm" className="bg-gradient-to-r from-primary to-info hover:from-primary/90 hover:to-info/90" id="sync-cctns-btn">
                    <Globe className="h-4 w-4" />
                    Sync to CCTNS
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-success/15 border border-success/30 rounded-lg px-3 py-1.5 text-xs text-success font-mono">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    CCTNS Synced
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Tabs with distinct colors */}
          <nav className="flex items-center gap-4 overflow-x-auto pb-1.5 scrollbar-none text-xs font-mono select-none" aria-label="Case sections">
            <Link
              href={`/cases/${caseId}`}
              id="tab-overview"
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === ""
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Overview
            </Link>

            <div className="h-4 w-[1px] bg-border/40 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold mr-1.5">Work:</span>
              {TABS.filter((t) => t.group === "Work").map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={`/cases/${caseId}/${tab.href}`}
                    id={`tab-${tab.href}`}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="h-4 w-[1px] bg-border/40 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold mr-1.5">Evidence:</span>
              {TABS.filter((t) => t.group === "Evidence").map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={`/cases/${caseId}/${tab.href}`}
                    id={`tab-${tab.href}`}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="h-4 w-[1px] bg-border/40 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold mr-1.5">Record:</span>
              {TABS.filter((t) => t.group === "Record").map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={`/cases/${caseId}/${tab.href}`}
                    id={`tab-${tab.href}`}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">{children}</section>

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Sync Case with CCTNS / eGujcop Portal
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Confirm case details and legal sections before pushing the payload to the national police records portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Payload Preview (JSON pushed to <code className="font-mono text-info">/mock/cctns/sync</code>):
            </p>
            <div className="rounded-lg bg-surface-alt p-4 text-xs font-mono border border-border/60 max-h-64 overflow-y-auto leading-relaxed text-muted-foreground">
              <pre>{JSON.stringify(syncPayload, null, 2)}</pre>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-accent/10 border border-accent/20 p-3 text-xs text-accent-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0 mt-1 animate-pulse" />
              <span>Upon confirmation, the case status will change to &quot;synced&quot; and a national FIR Number will be allocated.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSync} disabled={syncing} loading={syncing} className="bg-gradient-to-r from-primary to-info">Confirm Sync & Push</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
