import { Activity } from "lucide-react";

export default function ResponsesPage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-16 text-center grid-bg">
      <div className="rounded-full bg-primary/10 p-4">
        <Activity className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold">Provider Responses</p>
        <p className="text-sm text-muted-foreground mt-1">
          Analytics on telecom/bank mock responses — available in Phase 5.
        </p>
      </div>
    </div>
  );
}
