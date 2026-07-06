import { Network } from "lucide-react";

export default function AuditPage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-16 text-center grid-bg">
      <div className="rounded-full bg-primary/10 p-4">
        <Network className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold">Audit Timeline</p>
        <p className="text-sm text-muted-foreground mt-1">
          Full case audit trail and event log — available in Phase 5.
        </p>
      </div>
    </div>
  );
}
