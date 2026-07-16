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
      ? "border-l-2 border-l-primary"
      : accent === "success"
        ? "border-l-2 border-l-success"
        : accent === "warning"
          ? "border-l-2 border-l-accent"
          : accent === "destructive"
            ? "border-l-2 border-l-destructive"
            : "";

  const hoverClasses = hover
    ? "transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5"
    : "";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card p-5 text-card-foreground border-border/80",
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
