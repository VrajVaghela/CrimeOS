"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Shield,
  Search,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Sync global search with URL parameter 'q'
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearchQuery(q);
    } else {
      setSearchQuery("");
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  // Determine active states for sidebar links
  const isDashboardActive = pathname === "/dashboard";
  const isCasesActive = pathname.startsWith("/cases");

  // Dynamic breadcrumb computation
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Workspace", href: "/dashboard" }];

    if (parts[0] === "dashboard") {
      breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });
    } else if (parts[0] === "cases") {
      breadcrumbs.push({ label: "Cases", href: "/cases" });
      if (parts[1]) {
        // We are on a specific case page: /cases/[id]
        const caseIdShort = parts[1].substring(0, 8).toUpperCase();
        breadcrumbs.push({ label: `Case #${caseIdShort}`, href: `/cases/${parts[1]}` });

        if (parts[2]) {
          // Inner section: /cases/[id]/[tab]
          const tabName = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
          breadcrumbs.push({ label: tabName, href: `/cases/${parts[1]}/${parts[2]}` });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar - fixed 248px width, narrows to 214px at 1080px */}
      <aside className="w-[248px] lg:w-[214px] shrink-0 border-r border-border bg-[#0f0f0f] flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
        <div>
          {/* Brand Lockup with glass shield brand mark and red accent border */}
          <div className="h-[68px] px-6 border-b border-border flex items-center gap-3">
            <div className="glass p-1.5 rounded-squircle-sm border border-primary/30 flex items-center justify-center glow-primary">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-heading font-bold text-sm tracking-wider text-foreground">CRIME OS</span>
                <span className="font-heading font-bold text-sm tracking-wider text-primary ml-1">AI</span>
              </div>
              <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mt-0.5">Tactical Portal</span>
            </div>
          </div>

          {/* Navigation Stack */}
          <nav className="p-4 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-3 mb-2 block">
              Navigation
            </span>

            {/* Dashboard Link */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-squircle-sm text-sm transition-all duration-130 group relative ${
                isDashboardActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary glow-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#171717]"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
              {isDashboardActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>

            {/* Cases Link */}
            <Link
              href="/cases"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-squircle-sm text-sm transition-all duration-130 group relative ${
                isCasesActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary glow-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#171717]"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Case Registry</span>
              {isCasesActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          </nav>
        </div>

        {/* User Profile Section at bottom */}
        <div className="p-4 border-t border-border bg-[#0a0a0a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-squircle-sm bg-surface border border-border flex items-center justify-center text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-foreground">{user.full_name}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">{user.role}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              signOut();
              router.push("/login");
            }}
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-danger hover:bg-danger/10 px-3 rounded-squircle-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Command Topbar (68px) */}
        <header className="h-[68px] border-b border-border bg-card/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 select-none">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={crumb.href} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                  {isLast ? (
                    <span className="text-foreground font-semibold">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Search bar and Quick buttons */}
          <div className="flex items-center gap-4">
            {/* Search Bar - max width 280px, red focus ring on active */}
            <form onSubmit={handleSearchSubmit} className="relative w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search case registry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0b0b] border-border text-xs pl-8 pr-3 h-9 rounded-squircle-sm focus-visible:ring-accent focus-visible:border-accent/40 focus:glow-primary"
              />
            </form>

            <div className="h-5 w-[1px] bg-border/60" />

            {/* Square Icon Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-squircle-sm border-border bg-[#0b0b0b] hover:bg-[#171717] hover:text-primary transition-all text-muted-foreground relative"
                aria-label="System status alerts"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-squircle-sm border-border bg-[#0b0b0b] hover:bg-[#171717] transition-all text-muted-foreground"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-squircle-sm border-border bg-[#0b0b0b] hover:bg-[#171717] transition-all text-muted-foreground"
                aria-label="Help & Documentation"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
