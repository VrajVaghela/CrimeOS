import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The one heading pattern for every surface in the workspace.
 *
 * Deliberately spare: a heading, an optional line of context, and the actions
 * that belong to the whole surface. No eyebrow line above the title, and no
 * icon in a tinted box beside it — nine surfaces each inventing their own
 * decorated header is what made the app read as assembled rather than designed.
 * The heading carries its own weight.
 */

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Surface-level actions, right-aligned on wide viewports. */
  actions?: React.ReactNode;
  /** `page` for a route's primary heading, `section` for a region inside one. */
  level?: "page" | "section";
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, level = "page", ...props }, ref) => {
    const Heading = level === "page" ? "h1" : "h2";

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          className,
        )}
        {...props}
      >
        <div className="min-w-0 space-y-1">
          <Heading
            className={cn(
              "font-heading font-bold tracking-[-0.02em] text-foreground",
              level === "page" ? "text-2xl" : "text-lg",
            )}
          >
            {title}
          </Heading>
          {description ? (
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    );
  },
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
