import { Crosshair } from "lucide-react";

export default function PathPage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-16 text-center grid-bg">
      <div className="rounded-full bg-primary/10 p-4">
        <Crosshair className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold">Investigation Path</p>
        <p className="text-sm text-muted-foreground mt-1">
          AI-grounded investigation steps with SOP citations — available in Phase 3.
        </p>
      </div>
    </div>
  );
}
