"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, FileSearch, LogOut, Network, Plus, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getDashboard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DashboardOut } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (loading || !user) {
    return <main className="min-h-screen bg-background p-6 text-sm text-muted-foreground">Loading dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/70 p-6 grid-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Crime OS AI command dashboard</p>
            <h1 className="font-heading text-3xl font-bold md:text-4xl">Investigation Workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {user.full_name} <span className="font-mono">({user.role})</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              id="new-case-btn"
              onClick={() => router.push("/cases")}
              className="transition-all duration-200 hover:scale-105 hover:glow-primary"
            >
              <Plus className="h-4 w-4" />
              Cases
            </Button>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={FileSearch} label="Total cases" value={dashboard?.total_cases ?? 0} />
          <StatCard icon={Network} label="Pending requests" value={dashboard?.pending_requests ?? 0} />
          <StatCard icon={Activity} label="Audit events" value={dashboard?.audit_events ?? 0} />
        </div>

        <Card className="animate-fade-up">
          <CardHeader>
            <div>
              <CardTitle>Active cases</CardTitle>
              <CardDescription>Current station case queue</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" />
              <Button variant="secondary" size="sm" onClick={() => router.push("/cases")}>
                View all
              </Button>
            </div>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {(dashboard?.active_cases ?? []).length === 0 ? (
              <div className="rounded-xl border bg-muted p-5 text-sm text-muted-foreground">No cases seeded yet.</div>
            ) : (
              dashboard?.active_cases.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/cases/${item.id}`)}
                  className="w-full text-left flex flex-col gap-3 rounded-xl border bg-secondary p-4 transition-all duration-200 hover:border-primary/50 hover:glow-primary hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm text-primary">{item.case_number}</p>
                    <h2 className="font-heading text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">{item.crime_type ?? "Awaiting classification"}</p>
                  </div>
                  <StatusBadge status={item.status} />
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
    <Card className="glass animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-mono text-3xl font-bold">{value}</p>
        </div>
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </Card>
  );
}
