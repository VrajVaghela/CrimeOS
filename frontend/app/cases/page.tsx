"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Plus, Shield } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, createCase, getCases } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CaseOut } from "@/lib/types";

export default function CasesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cases, setCases] = useState<CaseOut[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setFetching(true);
    setError(null);
    try {
      setCases(await getCases());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load cases");
    } finally {
      setFetching(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) {
      setCreateError("Title is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCase({ title: newTitle.trim() });
      setDialogOpen(false);
      setNewTitle("");
      router.push(`/cases/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create case");
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background p-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/70 p-6 grid-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Crime OS AI</p>
            </div>
            <h1 className="font-heading text-3xl font-bold md:text-4xl">
              Cases{" "}
              <span className="text-muted-foreground text-2xl font-normal ml-1">/ शिकायतें</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </Button>
            <Button
              id="new-case-btn"
              onClick={() => setDialogOpen(true)}
              className="transition-all duration-200 hover:scale-105 hover:glow-primary"
            >
              <Plus className="h-4 w-4" />
              New Case{" "}
              <span className="text-primary-foreground/70 text-xs ml-1">/ नई शिकायत</span>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive bg-destructive/10 p-5 text-sm text-destructive-foreground"
          >
            {error}
            <Button variant="ghost" size="sm" onClick={load} className="ml-3">
              Retry
            </Button>
          </div>
        ) : null}

        <Card className="animate-fade-up">
          <CardHeader>
            <div>
              <CardTitle>All cases</CardTitle>
              <CardDescription>Station case queue — click to investigate</CardDescription>
            </div>
            <FileSearch className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-10 text-center grid-bg">
                <div className="rounded-full bg-primary/10 p-4">
                  <FileSearch className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-heading font-semibold">No cases yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first case to start an investigation
                  </p>
                </div>
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="transition-all duration-200 hover:scale-105 hover:glow-primary"
                >
                  <Plus className="h-4 w-4" />
                  New Case
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cases.map((item) => (
                  <button
                    key={item.id}
                    id={`case-row-${item.id}`}
                    onClick={() => router.push(`/cases/${item.id}`)}
                    className="w-full text-left flex flex-col gap-3 rounded-xl border bg-secondary p-4 transition-all duration-200 hover:border-primary/50 hover:glow-primary hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm text-primary">{item.case_number}</p>
                      <h2 className="font-heading text-lg font-semibold mt-0.5">{item.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {item.crime_type ?? "Awaiting classification"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(item.created_at).toLocaleDateString("en-IN")}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* New Case Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">New Investigation Case</DialogTitle>
            <DialogDescription>
              Enter a title for the new case. You'll upload the complaint next.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="case-title-input">Case title</Label>
              <Input
                id="case-title-input"
                placeholder="e.g. Cyber fraud — Rajesh Patel"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
                autoFocus
              />
              {createError ? (
                <p className="text-xs text-destructive" role="alert">{createError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setDialogOpen(false);
                setNewTitle("");
                setCreateError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              id="confirm-create-case-btn"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="transition-all duration-200 hover:scale-105 hover:glow-primary"
            >
              {creating ? "Creating…" : "Create case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
