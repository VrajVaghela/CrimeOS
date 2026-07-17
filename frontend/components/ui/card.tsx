import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    accent?: "primary" | "success" | "warning" | "destructive" | "none";
    hover?: boolean;
  }
>(({ className, accent = "none", hover = false, ...props }, ref) => {
  const accentBorder =
    accent === "primary"
      ? "border-primary/30 bg-primary/[0.03]"
      : accent === "success"
        ? "border-success/30 bg-success/[0.03]"
        : accent === "warning"
          ? "border-warn/30 bg-warn/[0.03]"
          : accent === "destructive"
            ? "border-destructive/30 bg-destructive/[0.03]"
            : "";

  const hoverClasses = hover
    ? "transition-colors duration-200 hover:border-border"
    : "";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-squircle border bg-card p-5 text-card-foreground border-border/80",
        accentBorder,
        hoverClasses,
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-heading text-lg font-semibold", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-4 flex items-center justify-between gap-4 border-t border-border/30 pt-4", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
