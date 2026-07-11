import * as React from "react";

import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = "horizontal", label, ...props }, ref) => {
    if (label) {
      return (
        <div className="flex items-center gap-3 py-2">
          <div
            ref={ref}
            className={cn("shrink-0 bg-border flex-1 h-px", className)}
            {...props}
          />
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider whitespace-nowrap">
            {label}
          </span>
          <div
            className={cn("shrink-0 bg-border flex-1 h-px", className)}
          />
        </div>
      );
    }

    return (
      <hr
        ref={ref}
        className={cn(
          "shrink-0 bg-border",
          orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = "Separator";

export { Separator };
