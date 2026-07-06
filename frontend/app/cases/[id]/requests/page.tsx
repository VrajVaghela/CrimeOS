import { FileSearch } from "lucide-react";

export default function RequestsPage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-16 text-center grid-bg">
      <div className="rounded-full bg-primary/10 p-4">
        <FileSearch className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold">Legal Requests</p>
        <p className="text-sm text-muted-foreground mt-1">
          Auto-generated CDR / bank freeze / platform data requests — available in Phase 4.
        </p>
      </div>
    </div>
  );
}
