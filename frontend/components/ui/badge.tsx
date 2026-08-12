import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-accent-strong border border-primary/30",
        secondary: "bg-secondary text-secondary-foreground border border-border/40",
        outline: "border border-border bg-transparent text-muted-foreground",
        destructive: "bg-destructive/15 text-destructive border border-destructive/30",
        success: "bg-success/15 text-success border border-success/30",
        warning: "bg-warn/15 text-warn border border-warn/30",
        info: "bg-info/15 text-info border border-info/30",
        solid: "bg-primary text-primary-foreground border border-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

function Badge({ className, variant, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="relative mr-1.5 flex h-2 w-2">
          {pulse && (
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-current opacity-75" />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
