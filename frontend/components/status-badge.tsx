import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "done" || normalized === "responded" || normalized === "approved" || normalized === "open"
      ? "bg-success text-success-foreground"
      : normalized === "processing" || normalized === "awaiting" || normalized === "pending"
        ? "bg-accent text-accent-foreground"
        : normalized === "failed" || normalized === "rejected"
          ? "bg-destructive text-destructive-foreground"
          : "bg-muted text-muted-foreground";

  return <Badge className={cn("font-mono uppercase", className)}>{status}</Badge>;
}
