"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEnumLabel } from "@/lib/i18n/enums";

interface StatusBadgeProps {
  status: string | null | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { statusLabel } = useEnumLabel();
  // A missing status is a data gap, not a crash: `statusLabel` already renders
  // an em dash for it, and one absent field must not take the whole route down.
  const normalized = (status ?? "").toLowerCase();

  let variant: "success" | "warning" | "info" | "destructive" | "secondary" = "secondary";
  let showDot = false;
  let showPulse = false;

  if (["done", "responded", "approved", "synced", "secure"].includes(normalized)) {
    variant = "success";
  } else if (["processing", "awaiting", "awaiting response", "awaiting_response"].includes(normalized)) {
    variant = "warning";
    showDot = true;
    showPulse = true;
  } else if (["running", "active_analysis", "uploaded"].includes(normalized)) {
    // Work a background task is doing right now. Info blue because the machine
    // is the actor, and a pulsing dot because a polling surface must show it is
    // still advancing — this is the one looping animation such a card gets, so
    // the card itself does not need to add spinners or its own ping.
    variant = "info";
    showDot = true;
    showPulse = true;
  } else if (["dispatched", "in_progress", "in progress"].includes(normalized)) {
    // Underway but not observably ticking, so the dot stays static.
    variant = "info";
    showDot = true;
  } else if (["failed", "rejected", "threat"].includes(normalized)) {
    variant = "destructive";
  }
  // Everything else — `queued`, `pending`, `draft`, unknown backend states —
  // keeps the neutral variant deliberately: not started is not a status colour.

  return (
    <Badge
      variant={variant}
      dot={showDot}
      pulse={showPulse}
      // `uppercase` is a no-op for Devanagari/Gujarati, so the badge keeps its
      // console styling for Latin statuses without mangling Indic text.
      className={cn("font-mono uppercase px-2 py-0.5 text-[10px] font-semibold tracking-wide")}
    >
      {statusLabel(status)}
    </Badge>
  );
}
