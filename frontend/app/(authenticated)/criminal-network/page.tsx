"use client";

import { useState } from "react";
import {
  Network,
  Crosshair,
  ShieldAlert,
  Users,
  AlertTriangle,
  Activity,
  Link2,
} from "lucide-react";
import dynamic from "next/dynamic";

import {
  NETWORK_NODES,
  NETWORK_EDGES,
  GANG_COMMUNITIES,
  type NetworkNode,
} from "@/lib/criminalNetworkData";

// D3 graph must be client-side only (no SSR)
const CriminalNetworkGraph = dynamic(
  () => import("@/components/criminal-network-graph"),
  { ssr: false, loading: () => <div className="h-[520px] rounded-squircle border border-border bg-[#0c0c0c] flex items-center justify-center"><span className="text-xs font-mono text-muted-foreground">Initialising graph engine…</span></div> }
);

// ─── Risk badge ────────────────────────────────────────────────────────────────

const RISK_STYLES: Record<NetworkNode["risk"], { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: { bg: "#3f1218", text: "#ef4444", border: "#ef4444", label: "CRITICAL" },
  HIGH:     { bg: "#3b220b", text: "#f59e0b", border: "#f59e0b", label: "HIGH"     },
  MODERATE: { bg: "#0e2a4a", text: "#3b82f6", border: "#3b82f6", label: "MODERATE" },
  SAFE:     { bg: "#063326", text: "#10b981", border: "#10b981", label: "SAFE"     },
};

function RiskBadge({ level }: { level: NetworkNode["risk"] }) {
  const s = RISK_STYLES[level] ?? RISK_STYLES.SAFE;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-squircle border border-border bg-card p-4 flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className="font-mono text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CriminalNetworkPage() {
  const [selected, setSelected] = useState<NetworkNode | null>(null);

  // Top 5 influencers by recidivism score
  const centralInfluencers = [...NETWORK_NODES]
    .sort((a, b) => b.recidivism - a.recidivism)
    .slice(0, 5);

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-fade-up">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="border-b border-border bg-toolbar px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-squircle-sm border border-border bg-surface-alt">
            <Network className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-base font-bold tracking-wide text-foreground">
              Criminal Network Intelligence
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              AI-detected relationships between offenders, gangs &amp; associates · synthetic demo data
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 p-6">
        {/* ── KPI Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Network Nodes"           value={NETWORK_NODES.length}      color="#22d3ee" />
          <KpiCard label="Detected Connections"    value={NETWORK_EDGES.length}      color="#f59e0b" />
          <KpiCard label="Identified Gang Networks" value={GANG_COMMUNITIES.length}  color="#ef4444" />
        </div>

        {/* ── Main Graph + Side Panel ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Force Graph — col-span 3 */}
          <div className="lg:col-span-3 rounded-squircle border border-border bg-card p-4">
            <div className="mb-3">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Relationship Network Graph
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                Drag nodes to explore · click a node for profile · scroll to zoom
              </p>
            </div>
            <CriminalNetworkGraph
              nodes={NETWORK_NODES}
              edges={NETWORK_EDGES}
              onSelect={setSelected}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Node Profile Panel */}
            <div className="rounded-squircle border border-accent/30 bg-accent/5 p-4">
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-widest text-accent">
                <Crosshair className="h-3.5 w-3.5" />
                Node Profile
              </h2>
              {selected ? (
                <div className="space-y-2.5">
                  <p className="font-mono text-sm font-bold text-foreground">
                    {selected.label}
                  </p>
                  <RiskBadge level={selected.risk} />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-[8px] border border-border bg-card p-2">
                      <p className="font-mono text-[10px] text-muted-foreground mb-0.5">
                        Influencer Score
                      </p>
                      <p className="font-mono text-xl font-bold text-primary">
                        {selected.recidivism}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-border bg-card p-2">
                      <p className="font-mono text-[10px] text-muted-foreground mb-0.5">
                        Gang
                      </p>
                      <p className="font-mono text-[11px] font-semibold text-warn truncate">
                        {selected.gang ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="font-mono text-[10px] text-muted-foreground mb-1">
                      Connections
                    </p>
                    <div className="space-y-1">
                      {NETWORK_EDGES.filter(
                        (e) => e.source === selected.id || e.target === selected.id
                      )
                        .slice(0, 4)
                        .map((e, i) => {
                          const peerId =
                            e.source === selected.id ? e.target : e.source;
                          const peer = NETWORK_NODES.find((n) => n.id === peerId);
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-2 py-1"
                            >
                              <Link2
                                className="h-3 w-3 shrink-0"
                                style={{ color: e.type === "gang_link" ? "#ef4444" : e.type === "financial" ? "#f59e0b" : "#3b82f6" }}
                              />
                              <span className="font-mono text-[10px] text-foreground truncate">
                                {peer?.label ?? peerId}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click any node in the graph to view its profile.
                </p>
              )}
            </div>

            {/* Central Influencers */}
            <div className="rounded-squircle border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-widest text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                Central Influencers
              </h2>
              <div className="space-y-2">
                {centralInfluencers.map((k, i) => (
                  <button
                    key={k.id}
                    onClick={() => setSelected(k)}
                    className="flex w-full items-center justify-between rounded-[8px] border border-border bg-surface-alt px-2.5 py-1.5 text-left transition-colors duration-[130ms] hover:bg-secondary hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="font-mono text-xs text-foreground truncate max-w-[100px]">
                        {k.label}
                      </span>
                    </span>
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: k.color }}
                    >
                      {k.recidivism}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Detected Gang Structures ──────────────────────────────────── */}
        <div className="rounded-squircle border border-border bg-card p-4">
          <h2 className="mb-4 flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            Detected Gang Structures
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {GANG_COMMUNITIES.map((c) => {
              const s = RISK_STYLES[c.risk] ?? RISK_STYLES.SAFE;
              return (
                <div
                  key={c.id}
                  className="rounded-[10px] border p-3 flex flex-col gap-1"
                  style={{ background: s.bg, borderColor: s.border + "44" }}
                >
                  <p
                    className="font-mono text-xs font-bold leading-tight"
                    style={{ color: s.text }}
                  >
                    {c.name}
                  </p>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {c.size}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    linked members
                  </p>
                  <RiskBadge level={c.risk} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <div className="rounded-squircle border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Graph Legend
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-8 rounded-full" style={{ background: "#ef4444", opacity: 0.7 }} />
              <span className="font-mono text-[11px] text-muted-foreground">Gang Link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-8 rounded-full" style={{ background: "#f59e0b", opacity: 0.7 }} />
              <span className="font-mono text-[11px] text-muted-foreground">Financial Link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-8 rounded-full" style={{ background: "#1e3a5f", opacity: 0.8 }} />
              <span className="font-mono text-[11px] text-muted-foreground">Communication / Associate</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] text-muted-foreground">Pulsing ring = CRITICAL risk</span>
            </div>
            {(["CRITICAL", "HIGH", "MODERATE", "SAFE"] as const).map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: RISK_STYLES[r].text }}
                />
                <span className="font-mono text-[11px] text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
