import { Radar } from "lucide-react";

export default function SummaryPage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-16 text-center grid-bg">
      <div className="rounded-full bg-primary/10 p-4">
        <Radar className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold">Case Summary</p>
        <p className="text-sm text-muted-foreground mt-1">
          One-click AI case summary with version history — available in Phase 5.
        </p>
      </div>
    </div>
  );
}
