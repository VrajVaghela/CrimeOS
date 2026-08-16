import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4 p-6 rounded-squircle border border-border/60 bg-card">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="font-heading text-xl font-bold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">
          The requested page or case record could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/cases"
            className="inline-flex items-center justify-center h-9 px-4 rounded-squircle-sm bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
          >
            Return to Case Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
