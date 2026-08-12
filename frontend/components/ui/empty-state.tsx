"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one empty state for every surface.
 *
 * An empty state teaches the interface: it names what the surface will hold and
 * gives the action that fills it. "No results" alone is a failure.
 *
 * The icon sits on the canvas at muted weight — no tinted circle, no gradient
 * blob. Eight surfaces each wrapping their icon in a differently coloured puck
 * is what made the palette read as random.
 */

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary action that fills the surface. */
  action?: { label: React.ReactNode; onClick: () => void; icon?: React.ComponentType<{ className?: string }> };
  /** `success` when emptiness is the good outcome — an empty approval queue. */
  tone?: "neutral" | "success";
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, tone = "neutral", ...props }, ref) => {
    const ActionIcon = action?.icon;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-squircle border border-dashed px-6 py-12 text-center",
          tone === "success"
            ? "border-success/30 bg-success/[0.03]"
            : "border-border bg-surface-alt/40",
          className,
        )}
        {...props}
      >
        <Icon
          className={cn(
            "h-7 w-7",
            tone === "success" ? "text-success" : "text-muted-foreground",
          )}
        />
        <div className="max-w-[46ch] space-y-1.5">
          <p className="font-heading text-base font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
            {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" /> : null}
            {action.label}
          </Button>
        ) : null}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
