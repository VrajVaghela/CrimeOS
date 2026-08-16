import * as React from "react";

import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, success, children, ...props }, ref) => {
    const stateClass = error
      ? "border-destructive/60 focus-visible:ring-destructive/60"
      : success
        ? "border-success/60 focus-visible:ring-success/60"
        : "border-border/60 focus-visible:ring-ring";

    return (
      <select
        className={cn(
          "h-10 w-full rounded-squircle-sm border bg-input px-3 py-2 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "transition-all duration-200",
          stateClass,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
