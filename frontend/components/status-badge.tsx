import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let variant: "success" | "warning" | "info" | "destructive" | "secondary" = "secondary";
  let showDot = false;
  let showPulse = false;

  if (["done", "responded", "approved", "synced", "secure"].includes(normalized)) {
    variant = "success";
  } else if (["processing", "awaiting", "awaiting response", "awaiting_response"].includes(normalized)) {
    variant = "warning";
    showDot = true;
    showPulse = true;
  } else if (["dispatched", "in_progress", "in progress"].includes(normalized)) {
    variant = "info";
    showDot = true;
  } else if (["failed", "rejected", "threat"].includes(normalized)) {
    variant = "destructive";
  }

  return (
    <Badge
      variant={variant}
      dot={showDot}
      pulse={showPulse}
      className={cn("font-mono uppercase px-2 py-0.5 text-[10px] font-semibold tracking-wide")}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
