import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  let bgClass = "bg-muted text-muted-foreground";
  let showDot = false;
  let dotColor = "";
  
  if (["done", "responded", "approved", "synced", "secure"].includes(normalized)) {
    bgClass = "bg-success/15 border border-success/30 text-success";
  } else if (["processing", "awaiting", "awaiting response", "awaiting_response"].includes(normalized)) {
    bgClass = "bg-accent/15 border border-accent/30 text-accent";
    showDot = true;
    dotColor = "bg-accent";
  } else if (["dispatched", "in_progress", "in progress"].includes(normalized)) {
    bgClass = "bg-primary/15 border border-primary/30 text-primary";
    showDot = true;
    dotColor = "bg-primary";
  } else if (["failed", "rejected", "threat"].includes(normalized)) {
    bgClass = "bg-destructive/15 border border-destructive/30 text-destructive";
  } else {
    bgClass = "bg-muted border border-border/40 text-muted-foreground";
  }

  return (
    <Badge className={cn("font-mono uppercase gap-1.5 px-2 py-0.5 text-xs font-semibold", bgClass)}>
      {showDot && (
        <span className="relative flex h-2 w-2">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColor)}></span>
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColor)}></span>
        </span>
      )}
      {status.replace("_", " ")}
    </Badge>
  );
}
