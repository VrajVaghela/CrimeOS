"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, Loader2, Plus, Search, X } from "lucide-react";

import { CaseList, CaseRow } from "@/components/case-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { interpolate, useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
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

export default function CasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { formatDate } = useFormatters();
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    const q = searchParams.get("q");
    if (q) {
      setSearchQuery(q);
      setSearching(true);
      void (async () => {
        try {
          setSearchResults(await searchCases(q.trim()));
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      })();
    } else {
      setSearchQuery("");
      setSearchResults(null);
    }
    void load();
  }, [user, searchParams]);

  async function load() {
    setFetching(true);
    setError(null);
    try {
      setCases(await getCases());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("cases.load_error"));
    } finally {
      setFetching(false);
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (!query.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const results = await searchCases(query.trim());
        if (!controller.signal.aborted) setSearchResults(results);
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
  }

  async function handleCreate() {
    if (!newTitle.trim()) {
      setCreateError(t("cases.title_required"));
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
      setCreateError(e instanceof ApiError ? e.message : t("cases.create_error"));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading || !user) {
    return (
      <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-10 w-full rounded-squircle-sm" />
          <Skeleton className="h-72 rounded-squircle" />
        </div>
      </main>
    );
  }

  const displayCases = searchResults ?? cases;

  return (
    <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl animate-fade-up flex-col gap-6">
        <PageHeader
          title={t("cases.title")}
          description={t("cases.subtitle")}
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("cases.new_case")}
            </Button>
          }
        />

        {error ? (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-squircle border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              className="ml-auto shrink-0 text-destructive"
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={t("cases.search_placeholder")}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-9"
              aria-label={t("cases.search_placeholder")}
            />
            {searchQuery && !searching ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-squircle-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                aria-label={t("common.dismiss")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {searching ? (
              <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {searchResults !== null ? (
            <p aria-live="polite" className="px-1 text-xs text-muted-foreground">
              {interpolate(t("cases.search_results"), {
                count: searchResults.length,
                query: searchQuery,
              })}
            </p>
          ) : null}
        </div>

        {fetching ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-squircle" />
            ))}
          </div>
        ) : displayCases.length === 0 ? (
          <EmptyState
            icon={searchQuery ? Search : FolderOpen}
            title={searchQuery ? t("cases.empty") : t("cases.all_clear")}
            description={searchQuery ? t("cases.empty_sub") : t("dashboard.cases_empty_sub")}
            action={
              searchQuery
                ? undefined
                : { label: t("cases.new_case"), onClick: () => setDialogOpen(true), icon: Plus }
            }
          />
        ) : (
          <CaseList>
            {displayCases.map((item) => (
              <CaseRow
                key={item.id}
                caseNumber={item.case_number}
                title={item.title}
                classification={item.crime_type ?? t("dashboard.awaiting_classification")}
                date={formatDate(item.created_at)}
                status={item.status}
                onSelect={() => router.push(`/cases/${item.id}`)}
              />
            ))}
          </CaseList>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{t("cases.create_dialog_title")}</DialogTitle>
            <DialogDescription>{t("cases.create_dialog_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-title-input" required>
              {t("cases.case_title_label")}
            </Label>
            <Input
              id="case-title-input"
              placeholder={t("cases.case_title_placeholder")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              autoFocus
              error={!!createError}
              aria-invalid={!!createError}
              aria-describedby={createError ? "case-title-error" : undefined}
            />
            {createError ? (
              <p id="case-title-error" className="text-xs text-destructive" role="alert">
                {createError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                setNewTitle("");
                setCreateError(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating} loading={creating}>
              {creating ? t("cases.creating") : t("cases.create_submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
