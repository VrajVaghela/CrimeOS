"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Map,
  Bell,
  Menu,
  Shield,
  Search,
  LogOut,
  ChevronRight,
  User,
  UserCheck,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, type TranslationKey } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    labelKey: "nav.dashboard",
    match: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/cases",
    icon: FolderOpen,
    labelKey: "shell.case_registry",
    match: (pathname: string) => pathname.startsWith("/cases"),
  },
  {
    href: "/heatmap",
    icon: Map,
    labelKey: "nav.heatmap",
    match: (pathname: string) => pathname === "/heatmap" || pathname === "/crime-heatmap",
  },
  {
    href: "/alert-center",
    icon: Bell,
    labelKey: "nav.alert_center",
    match: (pathname: string) => pathname === "/alert-center",
    badge: "!",
  },
  {
    href: "/repeat-offenders",
    icon: UserCheck,
    labelKey: "nav.repeat_offenders",
    match: (pathname: string) => pathname === "/repeat-offenders",
  },
  {
    href: "/criminal-network",
    icon: Network,
    labelKey: "nav.criminal_network",
    match: (pathname: string) => pathname === "/criminal-network",
  },
] as const satisfies ReadonlyArray<{
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: TranslationKey;
  match: (pathname: string) => boolean;
  badge?: string;
}>;

// Case tab segments that have a matching `nav.*` dictionary entry.
const NAV_TABS = [
  "overview",
  "ingestion",
  "osint",
  "path",
  "requests",
  "responses",
  "summary",
  "audit",
  "timeline",
  "evidence",
];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      }
    >
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </Suspense>
  );
}

function AuthenticatedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /**
   * Below `lg` the rail is an off-canvas drawer rather than a static column.
   * It used to stay open at every width, so at 390px it took 248px of the
   * viewport and left case titles wrapping one word per line.
   */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync global search with URL parameter 'q'
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearchQuery(q);
    } else {
      setSearchQuery("");
    }
  }, [searchParams]);

  // Route changes close the drawer, so tapping a nav item reveals the page it
  // navigated to instead of leaving the drawer covering it.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Handle global search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/cases");
    }
  };

  // Dynamic breadcrumb computation. Labels are localized; the case ID is an
  // identifier and stays verbatim.
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: t("shell.workspace"), href: "/dashboard" }];

    if (parts[0] === "dashboard") {
      breadcrumbs.push({ label: t("nav.dashboard"), href: "/dashboard" });
    } else if (parts[0] === "cases") {
      breadcrumbs.push({ label: t("nav.cases"), href: "/cases" });
      if (parts[1]) {
        // We are on a specific case page: /cases/[id]
        const caseIdShort = parts[1].substring(0, 8).toUpperCase();
        breadcrumbs.push({
          label: `${t("shell.case_crumb")} #${caseIdShort}`,
          href: `/cases/${parts[1]}`,
        });

        if (parts[2]) {
          // Inner section: /cases/[id]/[tab]
          const tabLabel = NAV_TABS.includes(parts[2])
            ? t(`nav.${parts[2]}` as TranslationKey)
            : parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
          breadcrumbs.push({ label: tabLabel, href: `/cases/${parts[1]}/${parts[2]}` });
        }
      }
    } else if (parts[0] === "alert-center") {
      breadcrumbs.push({ label: t("nav.alert_center"), href: "/alert-center" });
    } else if (parts[0] === "heatmap" || parts[0] === "crime-heatmap") {
      breadcrumbs.push({ label: t("nav.heatmap"), href: "/heatmap" });
    } else if (parts[0] === "repeat-offenders") {
      breadcrumbs.push({ label: t("nav.repeat_offenders"), href: "/repeat-offenders" });
    } else if (parts[0] === "criminal-network") {
      breadcrumbs.push({ label: t("nav.criminal_network"), href: "/criminal-network" });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-background font-sans text-foreground">
      {/* Drawer scrim, below `lg` only. */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label={t("shell.close_nav")}
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-background/70 lg:hidden"
        />
      )}

      <aside
        className={`z-50 flex h-dvh shrink-0 select-none flex-col overflow-hidden border-r border-border bg-sidebar transition-transform duration-200 ease-out max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[268px] lg:static lg:translate-x-0 lg:transition-[width] ${
          mobileNavOpen
            ? "max-lg:translate-x-0 max-lg:visible"
            : "max-lg:-translate-x-full max-lg:invisible max-lg:pointer-events-none lg:visible"
        } ${sidebarCollapsed ? "lg:w-16" : "lg:w-[248px]"}`}
        aria-label={t("shell.primary_nav")}
        aria-hidden={!mobileNavOpen ? "true" : undefined}
      >
        <div className="min-h-0 flex-1">
          {/* Brand lockup and rail control */}
          <div className={`flex h-16 items-center border-b border-border ${sidebarCollapsed ? "flex-col justify-center gap-1.5 px-2" : "justify-between gap-3 px-4"}`}>
            {/* Identity, not signal: the shield is the one place brand red lives.
                Blue is reserved for machine-authored content, so the mark cannot
                be blue without implying the product itself is an AI suggestion. */}
            <div className="flex shrink-0 items-center justify-center rounded-squircle-sm border border-border bg-surface-alt p-1.5">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-heading text-sm font-bold tracking-wider text-foreground">
                  CRIME OS AI
                </span>
                <span className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("shell.tactical_portal")}
                </span>
              </div>
            )}
            {/* Collapse on desktop; close the drawer on mobile. */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-8 w-8 shrink-0 rounded-squircle-sm text-muted-foreground hover:bg-secondary hover:text-foreground lg:inline-flex"
              aria-label={sidebarCollapsed ? t("shell.expand_nav") : t("shell.collapse_nav")}
              title={sidebarCollapsed ? t("shell.expand_nav") : t("shell.collapse_nav")}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(false)}
              className="h-8 w-8 shrink-0 rounded-squircle-sm text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label={t("shell.close_nav")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Stack */}
          <nav className={`space-y-1 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
            {!sidebarCollapsed && (
              <span className="mb-2 block px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("shell.navigation")}
              </span>
            )}

            {/* The rail is the app's primary navigation, so it is where the
                screen spends its Ferrari Red: a 2px active bar plus a tinted
                fill. Text stays at foreground weight — #ff0000 on carbon at
                14px does not clear 4.5:1, so red never carries the label. */}
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={sidebarCollapsed ? t(item.labelKey) : undefined}
                  className={`relative flex items-center gap-3 rounded-squircle-sm px-3 py-2.5 text-sm transition-colors duration-150 ${
                    sidebarCollapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-sm bg-primary"
                    />
                  ) : null}
                  <span className="relative shrink-0">
                    <Icon className="h-4 w-4" />
                    {"badge" in item && item.badge ? (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white"
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  {!sidebarCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Section at bottom */}
        <div className={`mt-auto shrink-0 border-t border-border bg-sidebar ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          <div className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="h-9 w-9 rounded-squircle-sm bg-surface border border-border flex items-center justify-center text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            {!sidebarCollapsed && <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-foreground">{user.full_name}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">{user.role}</p>
            </div>}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              signOut();
              router.push("/login");
            }}
            className={`w-full gap-2 text-xs text-muted-foreground hover:text-danger hover:bg-danger/10 px-3 rounded-squircle-sm ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
            aria-label={t("common.sign_out")}
            title={sidebarCollapsed ? t("common.sign_out") : undefined}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!sidebarCollapsed && <span>{t("common.sign_out")}</span>}
          </Button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Command Topbar (68px) */}
        <header className="relative z-30 flex h-16 shrink-0 select-none items-center justify-between gap-3 border-b border-border bg-toolbar px-4 lg:gap-4 lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              // Always open the drawer expanded, whatever the desktop rail state is.
              setSidebarCollapsed(false);
              setMobileNavOpen(true);
            }}
            className="-ml-2 h-11 w-11 shrink-0 rounded-squircle-sm text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label={t("shell.open_nav")}
            aria-expanded={mobileNavOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumbs. Keyed by position, not href: on /dashboard the trail is
              Workspace → Dashboard and both entries point at /dashboard, so an
              href key collided and React dropped one of the two crumbs.

              Below `sm` only the current page shows. A three-level trail at 390px
              truncated to "Wor… › C. › Case …", which is narrower than useless —
              the back link and the tab strip already carry the same context. */}
          <nav
            aria-label={t("shell.breadcrumb")}
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap font-mono text-xs text-muted-foreground"
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div
                  key={`${idx}-${crumb.href}`}
                  className={`flex min-w-0 items-center gap-1.5 ${isLast ? "" : "hidden sm:flex"}`}
                >
                  {idx > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="hidden h-3 w-3 shrink-0 text-muted-foreground/40 sm:block"
                    />
                  )}
                  {isLast ? (
                    <span aria-current="page" className="truncate font-semibold text-foreground">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="truncate transition-colors hover:text-foreground">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Search bar and Quick buttons */}
          <div className="shrink-0 flex items-center gap-2 lg:gap-4">
            {/* Search Bar - max width 280px, red focus ring on active */}
            <form onSubmit={handleSearchSubmit} className="relative hidden w-56 lg:block lg:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={t("shell.search_placeholder")}
                aria-label={t("shell.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border-border text-xs pl-8 pr-3 h-9 rounded-squircle-sm focus-visible:ring-accent focus-visible:border-accent/40"
              />
            </form>

            <div className="hidden h-5 w-px bg-border/60 sm:block" />

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              <LanguageToggle />
              <NotificationsPopover />
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="workspace-scroll flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
