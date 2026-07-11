import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => {
    const stateClass = error
      ? "border-destructive/60 focus-visible:ring-destructive/60"
      : success
        ? "border-success/60 focus-visible:ring-success/60"
        : "border-border/60 focus-visible:ring-ring";

    return (
      <input
        type={type}
        className={cn(
          "h-10 w-full rounded-lg border bg-input px-3 py-2 text-sm text-foreground",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "transition-all duration-200",
          stateClass,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
