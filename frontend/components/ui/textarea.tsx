import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, success, ...props }, ref) => {
    const stateClass = error
      ? "border-destructive/60 focus-visible:ring-destructive/60"
      : success
        ? "border-success/60 focus-visible:ring-success/60"
        : "border-input focus-visible:ring-ring";

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-squircle-sm border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          stateClass,
          className
        )}
        ref={ref}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
