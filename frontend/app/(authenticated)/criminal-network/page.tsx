"use client";

import { useState } from "react";
import {
  Crosshair,
  ShieldAlert,
  Users,
  AlertTriangle,
  Activity,
  Link2,
} from "lucide-react";
import dynamic from "next/dynamic";

import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import {
  NETWORK_NODES,
  NETWORK_EDGES,
  GANG_COMMUNITIES,
  type NetworkNode,
} from "@/lib/criminalNetworkData";

// D3 graph must be client-side only (no SSR)
const CriminalNetworkGraph = dynamic(
  () => import("@/components/criminal-network-graph"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-squircle border border-border bg-surface-alt">
        <span className="font-mono text-xs text-muted-foreground">
          Initialising graph engine…
        </span>
      </div>
    ),
  }
);

// ─── Risk badge ────────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: NetworkNode["risk"] }) {
  const variantMap: Record<NetworkNode["risk"], "destructive" | "warning" | "info" | "success"> = {
    CRITICAL: "destructive",
    HIGH: "warning",
    MODERATE: "info",
    SAFE: "success",
  };
  return (
    <Badge
      variant={variantMap[level] ?? "default"}
      className="font-mono text-[10px] uppercase font-bold tracking-wider"
    >
      {level}
    </Badge>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CriminalNetworkPage() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<NetworkNode | null>(null);

  // Top 5 influencers by recidivism score
  const centralInfluencers = [...NETWORK_NODES]
    .sort((a, b) => b.recidivism - a.recidivism)
    .slice(0, 5);

  return (
    <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl animate-fade-up flex-col gap-6">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <PageHeader
          title={t("criminal_network.title")}
          description={t("criminal_network.subtitle")}
        />

        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <MetricStrip columns={3}>
          <Metric
            label={t("criminal_network.kpi_nodes")}
            value={NETWORK_NODES.length}
            tone="default"
          />
          <Metric
            label={t("criminal_network.kpi_connections")}
            value={NETWORK_EDGES.length}
            tone="attention"
          />
          <Metric
            label={t("criminal_network.kpi_gangs")}
            value={GANG_COMMUNITIES.length}
            tone="critical"
          />
        </MetricStrip>

        {/* ── Main Graph + Side Panel ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Force Graph — lg:col-span-8 */}
          <div className="lg:col-span-8 rounded-squircle border border-border bg-card p-5 flex flex-col">
            <div className="mb-3">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                {t("criminal_network.graph_title")}
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                {t("criminal_network.graph_hint")}
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <CriminalNetworkGraph
                nodes={NETWORK_NODES}
                edges={NETWORK_EDGES}
                onSelect={setSelected}
              />
            </div>
          </div>

          {/* Right column — lg:col-span-4 */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Node Profile Panel */}
            <div className="rounded-squircle border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
                <h2 className="flex items-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Crosshair className="h-3.5 w-3.5 text-primary" />
                  {t("criminal_network.node_profile")}
                </h2>
                {selected ? (
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                    ID: {selected.id}
                  </span>
                ) : null}
              </div>
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-base font-bold text-foreground truncate">
                      {selected.label}
                    </p>
                    <RiskBadge level={selected.risk} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="rounded-squircle-sm border border-border bg-surface-alt p-2.5">
                      <p className="font-mono text-[10px] text-muted-foreground mb-0.5">
                        {t("criminal_network.influencer_score")}
                      </p>
                      <p className="font-mono text-xl font-bold text-foreground">
                        {selected.recidivism}
                      </p>
                    </div>
                    <div className="rounded-squircle-sm border border-border bg-surface-alt p-2.5">
                      <p className="font-mono text-[10px] text-muted-foreground mb-0.5">
                        {t("criminal_network.gang")}
                      </p>
                      <p className="font-mono text-xs font-semibold text-warn truncate">
                        {selected.gang ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="font-mono text-[10px] text-muted-foreground mb-1.5">
                      {t("criminal_network.connections")}
                    </p>
                    <div className="space-y-1.5">
                      {NETWORK_EDGES.filter(
                        (e) => e.source === selected.id || e.target === selected.id
                      )
                        .slice(0, 4)
                        .map((e, i) => {
                          const peerId =
                            e.source === selected.id ? e.target : e.source;
                          const peer = NETWORK_NODES.find((n) => n.id === peerId);
                          const linkColor =
                            e.type === "gang_link"
                              ? "text-destructive"
                              : e.type === "financial"
                                ? "text-warn"
                                : "text-info";
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded-squircle-sm border border-border bg-surface-alt px-2.5 py-1.5"
                            >
                              <Link2 className={`h-3 w-3 shrink-0 ${linkColor}`} />
                              <span className="font-mono text-[11px] text-foreground truncate">
                                {peer?.label ?? peerId}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  {t("criminal_network.node_click_hint")}
                </p>
              )}
            </div>

            {/* Central Influencers */}
            <div className="rounded-squircle border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                {t("criminal_network.central_influencers")}
              </h2>
              <div className="space-y-2">
                {centralInfluencers.map((k, i) => {
                  const scoreColor =
                    k.recidivism >= 85
                      ? "text-destructive"
                      : k.recidivism >= 70
                        ? "text-warn"
                        : "text-info";
                  return (
                    <button
                      key={k.id}
                      onClick={() => setSelected(k)}
                      className="flex w-full items-center justify-between rounded-squircle-sm border border-border bg-surface-alt px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-elevated hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{i + 1}
                        </span>
                        <span className="font-mono text-xs text-foreground truncate max-w-[120px]">
                          {k.label}
                        </span>
                      </span>
                      <span className={`font-mono text-sm font-bold ${scoreColor}`}>
                        {k.recidivism}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Detected Gang Structures ──────────────────────────────────── */}
        <div className="rounded-squircle border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            {t("criminal_network.gang_structures")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {GANG_COMMUNITIES.map((c) => {
              const isCritical = c.risk === "CRITICAL";
              const isHigh = c.risk === "HIGH";
              const isMod = c.risk === "MODERATE";
              const borderClass = isCritical
                ? "border-destructive/40"
                : isHigh
                  ? "border-warn/40"
                  : isMod
                    ? "border-info/40"
                    : "border-success/40";
              const textClass = isCritical
                ? "text-destructive"
                : isHigh
                  ? "text-warn"
                  : isMod
                    ? "text-info"
                    : "text-success";

              return (
                <div
                  key={c.id}
                  className={`rounded-squircle-sm border p-3.5 flex flex-col gap-1.5 bg-surface-alt ${borderClass}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className={`font-mono text-xs font-bold leading-tight truncate ${textClass}`}>
                      {c.name}
                    </p>
                    <RiskBadge level={c.risk} />
                  </div>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {c.size}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {t("criminal_network.linked_members")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <div className="rounded-squircle border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {t("criminal_network.legend_title")}
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-8 rounded-full bg-destructive/70" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("criminal_network.legend_gang")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-8 rounded-full bg-warn/70" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("criminal_network.legend_financial")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-8 rounded-full bg-info/70" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("criminal_network.legend_comms")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("criminal_network.legend_critical_ring")}
              </span>
            </div>
            {(["CRITICAL", "HIGH", "MODERATE", "SAFE"] as const).map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    r === "CRITICAL"
                      ? "bg-destructive"
                      : r === "HIGH"
                        ? "bg-warn"
                        : r === "MODERATE"
                          ? "bg-info"
                          : "bg-success"
                  }`}
                />
                <span className="font-mono text-[11px] text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
