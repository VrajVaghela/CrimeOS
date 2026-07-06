"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, getCase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CaseDetailOut } from "@/lib/types";

const TABS = [
  { label: "Ingestion", href: "ingestion" },
  { label: "Investigation", href: "path" },
  { label: "Requests", href: "requests" },
  { label: "Responses", href: "responses" },
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

  const activeTab = TABS.find((t) => pathname.endsWith(t.href))?.href ?? "ingestion";

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
    </main>
  );
}
