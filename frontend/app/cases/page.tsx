"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Loader2, Plus, Search, Shield, X, ArrowLeft, FolderOpen } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
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
import { ApiError, createCase, getCases, searchCases } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CaseOut } from "@/lib/types";

const CASE_COLORS = ["border-l-primary", "border-l-info", "border-l-violet"] as const;

export default function CasesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [cases, setCases] = useState<CaseOut[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CaseOut[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { setSearchResults(null); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchCases(query.trim());
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
  }

  async function handleCreate() {
    if (!newTitle.trim()) { setCreateError("Title is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCase({ title: newTitle.trim() });
      setDialogOpen(false);
      setNewTitle("");
      router.push(`/cases/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create case");
    } finally { setCreating(false); }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchInputRef.current?.focus(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-12 w-full rounded-lg" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </main>
    );
  }

  const displayCases = searchResults ?? cases;

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-surface-alt/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-alt/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-0.5">
              <Shield className="h-3 w-3 text-primary" />
              {t("login.title")} · {t("cases.title")}
            </div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl flex items-center gap-3">
              {t("cases.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="hidden sm:flex">
              <ArrowLeft className="h-4 w-4" />
              {t("nav.dashboard")}
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-primary to-info hover:from-primary/90 hover:to-info/90">
              <Plus className="h-4 w-4" />
              {t("cases.new_case")}
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        {error ? (
          <div role="alert" className="animate-fade-down rounded-xl border border-rose/30 bg-rose/10 p-4 text-sm text-rose flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-rose shrink-0" />
            {error}
            <Button variant="ghost" size="sm" onClick={load} className="ml-auto shrink-0 text-rose">Retry</Button>
          </div>
        ) : null}

        <Card className="animate-fade-up">
          <CardHeader>
            <div>
              <CardTitle>{t("cases.title")}</CardTitle>
              <CardDescription>{t("cases.subtitle")}</CardDescription>
            </div>
            <FileSearch className="h-5 w-5 text-muted-foreground" />
          </CardHeader>

          <div className="px-5 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder={t("cases.search_placeholder")}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && !searching && (
                <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-primary" />
              )}
            </div>
            {searchResults !== null && (
              <p className="text-xs text-muted-foreground mt-2">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for{" "}
                <span className="font-mono text-info">&quot;{searchQuery}&quot;</span>
              </p>
            )}
          </div>

          <CardContent>
            {fetching ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : displayCases.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-alt/50 p-12 text-center border border-dashed border-border/40">
                <div className="rounded-full bg-gradient-to-br from-primary/20 to-info/20 p-4">
                  {searchQuery ? <Search className="h-8 w-8 text-primary" /> : <FolderOpen className="h-8 w-8 text-primary" />}
                </div>
                <div className="max-w-xs">
                  <p className="font-heading font-semibold text-foreground text-lg">
                    {searchQuery ? t("cases.empty") : t("cases.all_clear")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery ? t("cases.empty") : t("dashboard.cases_empty_sub")}
                  </p>
                </div>
                {!searchQuery && <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> {t("cases.new_case")}</Button>}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayCases.map((item, idx) => (
                  <button
                    key={item.id}
                    id={`case-row-${item.id}`}
                    onClick={() => router.push(`/cases/${item.id}`)}
                    className={`w-full text-left flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:glow-primary hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between animate-fade-up border-l-2 ${CASE_COLORS[idx % CASE_COLORS.length]}`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-primary">{item.case_number}</p>
                      <h2 className="font-heading text-lg font-semibold mt-0.5 truncate">{item.title}</h2>
                      <p className="text-sm text-muted-foreground">{item.crime_type ?? "Awaiting classification"}</p>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{t("cases.create_dialog_title")}</DialogTitle>
            <DialogDescription>{t("cases.create_dialog_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="case-title-input" required>{t("cases.case_title_label")}</Label>
              <Input
                placeholder={t("cases.case_title_placeholder")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
                autoFocus
                error={!!createError}
              />
              {createError ? <p className="text-xs text-rose" role="alert">{createError}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDialogOpen(false); setNewTitle(""); setCreateError(null); }}>{t("common.cancel")}</Button>
            <Button onClick={() => void handleCreate()} disabled={creating} loading={creating}>{creating ? t("cases.creating") : t("cases.create_submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
