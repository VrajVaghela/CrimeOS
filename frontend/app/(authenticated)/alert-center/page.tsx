"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Mail,
  MessageSquare,
  Send,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity;
  location: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  isDismissed: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "alt-001",
    title: "Hotspot Emergence",
    severity: "CRITICAL",
    location: "Zeta Region",
    description:
      "New crime cluster forming near sector 7, Zeta Region. 11 incidents in 72 hours.",
    timestamp: "6/20/2026, 3:56:02 AM",
    isRead: false,
    isDismissed: false,
  },
  {
    id: "alt-002",
    title: "Patrol Gap Identified",
    severity: "HIGH",
    location: "Theta Ward",
    description:
      "No patrol coverage in Theta Ward between 02:00–05:00. 3 incidents reported during gap window.",
    timestamp: "6/20/2026, 3:12:45 AM",
    isRead: false,
    isDismissed: false,
  },
  {
    id: "alt-003",
    title: "Drug Network Activity",
    severity: "CRITICAL",
    location: "Delta Quarter",
    description:
      "Increased narcotics-related incidents in Delta Quarter. Pattern matches known supply chain routes.",
    timestamp: "6/20/2026, 2:48:11 AM",
    isRead: false,
    isDismissed: false,
  },
  {
    id: "alt-004",
    title: "High-Risk Offender Active",
    severity: "HIGH",
    location: "Gamma Zone",
    description:
      "Known repeat offender flagged in Gamma Zone vicinity. Last known location updated 45 minutes ago.",
    timestamp: "6/20/2026, 2:20:33 AM",
    isRead: false,
    isDismissed: false,
  },
  {
    id: "alt-005",
    title: "Cyber Fraud Surge",
    severity: "CRITICAL",
    location: "Epsilon Sector",
    description:
      "17 new cyber fraud complaints filed within 24 hours. Coordinated phishing campaign suspected.",
    timestamp: "6/20/2026, 1:54:09 AM",
    isRead: true,
    isDismissed: false,
  },
  {
    id: "alt-006",
    title: "New Gang Cluster Identified",
    severity: "MEDIUM",
    location: "Lambda Block",
    description:
      "AI pattern recognition detected a new organized group operating in Lambda Block area.",
    timestamp: "6/20/2026, 1:30:22 AM",
    isRead: false,
    isDismissed: false,
  },
  {
    id: "alt-007",
    title: "Vehicle Theft Spike",
    severity: "HIGH",
    location: "Sigma District",
    description:
      "4 vehicle thefts reported in Sigma District in the past 6 hours. Common modus operandi identified.",
    timestamp: "6/20/2026, 12:45:18 AM",
    isRead: true,
    isDismissed: false,
  },
  {
    id: "alt-008",
    title: "Domestic Violence Alert",
    severity: "MEDIUM",
    location: "Omega Ward",
    description:
      "Repeat domestic violence calls from same residential block in Omega Ward. 3 calls in 48 hours.",
    timestamp: "6/19/2026, 11:58:41 PM",
    isRead: false,
    isDismissed: false,
  },
  {
    id: "alt-009",
    title: "Infrastructure Vulnerability",
    severity: "LOW",
    location: "Kappa Region",
    description:
      "Street lighting failures reported in Kappa Region corridor. Historical correlation with petty crime uptick.",
    timestamp: "6/19/2026, 11:22:05 PM",
    isRead: true,
    isDismissed: false,
  },
  {
    id: "alt-010",
    title: "Public Event Risk Assessment",
    severity: "MEDIUM",
    location: "Alpha Central",
    description:
      "Large public gathering scheduled in Alpha Central this weekend. AI recommends enhanced patrol deployment.",
    timestamp: "6/19/2026, 10:15:30 PM",
    isRead: false,
    isDismissed: false,
  },
];

// ─── Severity Badge Component ────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const variantMap: Record<AlertSeverity, "destructive" | "warning" | "info" | "success"> = {
    CRITICAL: "destructive",
    HIGH: "warning",
    MEDIUM: "info",
    LOW: "success",
  };

  return (
    <Badge
      variant={variantMap[severity] ?? "default"}
      className="font-mono text-[10px] uppercase font-bold tracking-wider"
    >
      {severity}
    </Badge>
  );
}

const SEVERITY_OPTIONS: Array<{ label: string; value: AlertSeverity | "ALL" }> =
  [
    { label: "All Severities", value: "ALL" },
    { label: "CRITICAL", value: "CRITICAL" },
    { label: "HIGH", value: "HIGH" },
    { label: "MEDIUM", value: "MEDIUM" },
    { label: "LOW", value: "LOW" },
  ];

// ─── Alert Card Component ────────────────────────────────────────────────────

function AlertCard({
  alert,
  onMarkRead,
  onDismiss,
}: {
  alert: AlertItem;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    // Wait for the animation to complete before removing
    setTimeout(() => onDismiss(alert.id), 220);
  }, [alert.id, onDismiss]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-squircle transition-all duration-[220ms] ease-out",
        dismissing
          ? "max-h-0 opacity-0 scale-95 mb-0 py-0 border-0"
          : "max-h-[400px] opacity-100 scale-100",
        alert.isRead
          ? "border border-border/40 bg-card/60"
          : "border border-border bg-card shadow-xs"
      )}
    >
      <div className="flex items-start gap-4 p-4 lg:p-5">
        {/* Left: Title, Severity Badge, Location */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <h3
              className={cn(
                "font-heading text-sm max-w-xs md:max-w-md truncate",
                alert.isRead
                  ? "font-normal text-muted-foreground"
                  : "font-semibold text-foreground"
              )}
            >
              {alert.title}
            </h3>
            <SeverityBadge severity={alert.severity} />
            <span className="inline-flex items-center gap-1 rounded-squircle-sm border border-border bg-surface-alt px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {alert.location}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-[600px]">
            {alert.description}
          </p>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/60">
            {alert.timestamp}
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMarkRead(alert.id)}
            className={cn(
              "h-8 w-8 rounded-squircle-sm transition-colors duration-[130ms] focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none",
              alert.isRead
                ? "bg-success/15 text-success hover:bg-success/25"
                : "text-muted-foreground hover:bg-surface-alt hover:text-foreground"
            )}
            title={alert.isRead ? "Already read" : "Mark as read"}
            aria-label={alert.isRead ? "Already read" : "Mark as read"}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 rounded-squircle-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-[130ms] focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
            title="Dismiss alert"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AlertCenterPage() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "ALL">(
    "ALL"
  );
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick() {
      setShowDropdown(false);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [showDropdown]);

  // Mark as read handler
  const handleMarkRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: !a.isRead } : a))
    );
  }, []);

  // Dismiss handler
  const handleDismiss = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isDismissed: true } : a))
    );
  }, []);

  // Active (non-dismissed) alerts
  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.isDismissed),
    [alerts]
  );

  // Filtered alerts for display
  const filteredAlerts = useMemo(() => {
    if (severityFilter === "ALL") return activeAlerts;
    return activeAlerts.filter((a) => a.severity === severityFilter);
  }, [activeAlerts, severityFilter]);

  // KPI computations
  const stats = useMemo(
    () => ({
      active: activeAlerts.length,
      critical: activeAlerts.filter((a) => a.severity === "CRITICAL").length,
      unread: activeAlerts.filter((a) => !a.isRead).length,
    }),
    [activeAlerts]
  );

  return (
    <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl animate-fade-up flex-col gap-6">
        {/* Header */}
        <PageHeader
          title={t("alert_center.title")}
          description={t("alert_center.subtitle")}
          actions={
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown((v) => !v);
                }}
                className="gap-1.5 font-mono text-xs border border-border bg-card text-foreground hover:bg-surface-alt"
              >
                {severityFilter === "ALL"
                  ? t("alert_center.filter_all")
                  : severityFilter}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showDropdown && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-squircle-sm border border-border bg-card shadow-lg">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSeverityFilter(opt.value);
                        setShowDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface-alt ${
                        opt.value === severityFilter
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />

        {/* KPI Summary Strip */}
        <MetricStrip columns={4}>
          <Metric
            label={t("alert_center.stat_active")}
            value={stats.active}
            tone="default"
            hint="Live unhandled signals"
          />
          <Metric
            label={t("alert_center.stat_critical")}
            value={stats.critical}
            tone={stats.critical > 0 ? "critical" : "default"}
            hint="Urgent response needed"
          />
          <Metric
            label={t("alert_center.stat_unread")}
            value={stats.unread}
            tone={stats.unread > 0 ? "attention" : "default"}
            hint="Awaiting officer review"
          />
          <Metric
            label={t("alert_center.stat_channels")}
            value={3}
            hint={
              <span className="flex items-center gap-2 font-mono text-[10px]">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-foreground" />
                  {t("alert_center.channel_email")}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-foreground" />
                  {t("alert_center.channel_chat")}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1">
                  <Send className="h-3 w-3 text-foreground" />
                  {t("alert_center.channel_telegram")}
                </span>
              </span>
            }
          />
        </MetricStrip>

        {/* Live Alert Feed */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-foreground">
              {t("alert_center.feed_title")}
            </h2>
            <span className="relative ml-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-squircle border border-border bg-card py-12 px-6">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {t("alert_center.empty")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
