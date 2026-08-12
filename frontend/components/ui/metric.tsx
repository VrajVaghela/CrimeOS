"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Case and station figures, read as a set.
 *
 * One bordered strip divided into columns rather than N free-floating cards —
 * these numbers are read against each other, so they share a surface and a
 * baseline. The label sits above the value; there is no icon in a tinted puck,
 * because an icon beside "Total cases" tells an officer nothing the word didn't.
 *
 * Values are mono for tabular figures: a column of counts must compare cleanly.
 */

interface MetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Trailing context for the value, e.g. "/ 12" or a unit. */
  suffix?: React.ReactNode;
  /** One short qualifier line beneath, e.g. the current workflow stage. */
  hint?: React.ReactNode;
  /** Semantic weight for the value. Reserve `attention` for the number that needs acting on. */
  tone?: "default" | "success" | "attention" | "critical";
}

const TONE_CLASS: Record<NonNullable<MetricProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  attention: "text-warn",
  critical: "text-destructive",
};

function Metric({ label, value, suffix, hint, tone = "default" }: MetricProps) {
  return (
    <div className="min-w-0 bg-card px-5 py-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-[1.75rem] font-bold leading-none tracking-[-0.02em] tabular-nums",
            TONE_CLASS[tone],
          )}
        >
          {value}
        </span>
        {suffix ? (
          <span className="font-mono text-sm font-medium text-muted-foreground">{suffix}</span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-1.5 truncate text-xs text-muted-foreground" title={typeof hint === "string" ? hint : undefined}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface MetricStripProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column count at the widest breakpoint. Below it the strip stacks to two, then one. */
  columns?: 2 | 3 | 4;
}

const COLUMN_CLASS: Record<NonNullable<MetricStripProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * The 1px rules between metrics are the container's own background showing
 * through a `gap-px` grid — one declaration instead of per-child border
 * arithmetic that breaks the moment the column count changes.
 */
function MetricStrip({ className, columns = 3, children, ...props }: MetricStripProps) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-squircle border border-border/80 bg-border/60",
        COLUMN_CLASS[columns],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Metric, MetricStrip };
