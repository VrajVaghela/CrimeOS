"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

/**
 * The case registry row — one implementation, used by the dashboard queue and
 * the registry page. Previously each surface carried its own near-identical copy
 * with different radii, hover behaviour, and date formatting, which is why the
 * same case looked like two different records depending on where you saw it.
 *
 * Rows share one bordered surface with hairline rules instead of sitting as N
 * separate cards. This is a registry an officer scans down a column, so density
 * and a common left edge matter more than individual card presence.
 *
 * The case number is an identifier, not an alert: it is set in mono at
 * foreground weight, never in Ferrari Red. Red on this screen belongs to the
 * primary action.
 */

interface CaseRowProps {
  caseNumber: string;
  title: string;
  /** Crime classification, or the localized "awaiting classification" copy. */
  classification: string;
  /** Preformatted, locale-aware date string. */
  date: string;
  status: string;
  onSelect: () => void;
  /** Optional trailing marker, e.g. a role-specific "awaiting audit" tag. */
  marker?: React.ReactNode;
}

function CaseRow({
  caseNumber,
  title,
  classification,
  date,
  status,
  onSelect,
  marker,
}: CaseRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-200",
        "hover:bg-primary/[0.04] focus-visible:bg-primary/[0.04] focus-visible:outline-none",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-xs font-medium tracking-tight text-muted-foreground">
            {caseNumber}
          </span>
          {marker}
        </div>
        <p className="mt-1 truncate font-heading text-[0.9375rem] font-semibold text-foreground">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{classification}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Fixed-width cells from `sm` up, so dates and statuses form real columns
            down the list — left to intrinsic width they jittered row to row and
            the chevron never landed twice in the same place. Below `sm` the
            columns collapse to intrinsic width instead, because a 124px status
            cell on a 390px screen starves the case title. */}
        <span className="hidden w-[92px] text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
          {date}
        </span>
        <span className="flex justify-end sm:w-[124px]">
          <StatusBadge status={status} />
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
      </div>
    </button>
  );
}

/** Shared surface for a run of `CaseRow`s. */
function CaseList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "divide-y divide-border/60 overflow-hidden rounded-squircle border border-border/80 bg-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { CaseRow, CaseList };
