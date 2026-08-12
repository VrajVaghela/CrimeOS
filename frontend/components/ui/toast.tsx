"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Transient confirmation for an action that does not navigate.
 *
 * Extracted from `evidence-review-workspace` and `response-correlation-panel`,
 * which each carried their own byte-identical copy — so a fix to one silently
 * left the other behind.
 *
 * This is one of the three surfaces allowed a drop shadow, because it genuinely
 * floats above live case content and has no border relationship to anything
 * beneath it.
 */

export interface ToastMessage {
  title: string;
  description: string;
  variant?: "success" | "destructive";
}

/** Owns the 4-second dismiss timer and clears it on unmount. */
export function useToast() {
  const [toast, setToast] = React.useState<ToastMessage | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback((message: ToastMessage) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { toast, show };
}

export function Toast({ message }: { message: ToastMessage | null }) {
  if (!message) return null;
  const isError = message.variant === "destructive";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "elev-overlay fixed bottom-4 right-4 z-50 flex max-w-sm animate-fade-up flex-col gap-1 rounded-squircle border p-4",
        isError
          ? "border-destructive/40 bg-destructive/10"
          : "border-success/30 bg-surface-elevated",
      )}
    >
      <div className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
        {isError ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        )}
        {message.title}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{message.description}</p>
    </div>
  );
}
