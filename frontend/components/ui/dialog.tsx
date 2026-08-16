"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContextValue {
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
      }
      // Trap focus
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Focus the first interactive element immediately
    const timer = setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 30);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
      previousFocusRef.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Darkened blurred backdrop per Phase 9E spec */}
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-background/85 backdrop-blur-xl transition-opacity animate-fade-in"
          onClick={() => onOpenChange(false)}
        />
        {/* Container */}
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full z-50"
          ref={dialogRef}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { t } = useLanguage();
  const ctx = React.useContext(DialogContext);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-lg rounded-squircle border border-border/60 bg-card p-6 elev-overlay",
        "animate-scale-in",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        onClick={() => ctx?.onOpenChange(false)}
        className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-squircle-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        aria-label={t("common.close")}
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground mt-1.5", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 gap-2 sm:gap-0",
        className,
      )}
      {...props}
    />
  );
}
