"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Globe, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, getCase, syncCctns } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CaseDetailOut } from "@/lib/types";

const TABS = [
  { label: "Ingestion", href: "ingestion" },
  { label: "Investigation", href: "path" },
  { label: "Requests", href: "requests" },
  { label: "Responses", href: "responses" },
  { label: "Evidence", href: "evidence" },
  { label: "Summary", href: "summary" },
  { label: "Audit", href: "audit" },
] as const;


export default function CaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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


  const activeTab = TABS.find((t) => pathname.endsWith(t.href))?.href ?? "ingestion";

  const syncPayload = caseData ? {
    cctns_header: {
      state: "Gujarat",
      district: "Ahmedabad City",
      police_station: "Cyber Crime PS",
      timestamp: new Date().toISOString()
    },
    fir_details: {
      internal_case_no: caseData.case_number,
      title: caseData.title,
      crime_type: caseData.crime_type,
      registered_date: caseData.created_at
    },
    complainant: caseData.complaints?.[0] ? {
      language: caseData.complaints[0].detected_language,
      original_text_preview: caseData.complaints[0].raw_text?.substring(0, 100) + "..."
    } : null,
    legal_citations: caseData.complaints?.[0]?.entities ? caseData.complaints[0].entities.map(e => ({
      type: e.entity_type,
      value: e.value
    })) : []
  } : null;

  if (loading || !user) {
    return <main className="min-h-screen bg-background p-6"><Skeleton className="h-40 w-full rounded-xl" /></main>;
  }


  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/70 p-6 grid-bg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/cases")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Cases
            </Button>
          </div>
          {fetching ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-80" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : caseData ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm text-primary">{caseData.case_number}</span>
                  <StatusBadge status={caseData.status} />
                </div>
                <h1 className="font-heading text-2xl font-bold md:text-3xl">{caseData.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {caseData.crime_type ?? "Awaiting classification"}{" "}
                  <span className="font-mono">·</span>{" "}
                  {new Date(caseData.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                {caseData.status !== "synced" ? (
                  <Button
                    onClick={() => setSyncDialogOpen(true)}
                    className="bg-primary hover:scale-105 transition-all duration-200 gap-1.5 glow-primary"
                    size="sm"
                    id="sync-cctns-btn"
                  >
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


          {/* Tabs */}
          <nav
            className="mt-5 flex gap-1 overflow-x-auto pb-1 scrollbar-none"
            aria-label="Case sections"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={`/cases/${caseId}/${tab.href}`}
                  id={`tab-${tab.href}`}
                  className={[
                    "flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground glow-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-6">{children}</section>

      {/* CCTNS Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="glass max-w-2xl text-foreground">
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
              Payload Preview (JSON pushed to national endpoint `/mock/cctns/sync`):
            </p>
            <div className="rounded bg-muted p-4 text-xs font-mono border border-border/40 max-h-72 overflow-y-auto leading-relaxed text-muted-foreground">
              <pre>{JSON.stringify(syncPayload, null, 2)}</pre>
            </div>
            <p className="text-xs text-amber-500 font-medium">
              * Note: Upon confirmation, the case status will change to "synced" and a national FIR Number will be allocated.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSyncDialogOpen(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="bg-primary hover:scale-105 transition-all duration-200"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Payload...
                </>
              ) : (
                "Confirm Sync & Push"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

