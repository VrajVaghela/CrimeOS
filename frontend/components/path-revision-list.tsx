import React from "react";
import { GitBranch, Clock, ChevronRight } from "lucide-react";
import type { InvestigationPathOut } from "@/lib/types";

interface PathRevisionListProps {
  revisions: InvestigationPathOut[];
  activeRevisionId: string | null;
  onSelectRevision: (revision: InvestigationPathOut) => void;
  selectedRevisionId: string | null;
}

export function PathRevisionList({
  revisions,
  activeRevisionId,
  onSelectRevision,
  selectedRevisionId,
}: PathRevisionListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-4 w-4 text-primary animate-pulse" />
        <h3 className="text-sm font-semibold font-heading text-foreground">
          Revision History / संशोधन इतिहास
        </h3>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {revisions.map((rev) => {
          const isActive = rev.id === activeRevisionId;
          const isSelected = rev.id === selectedRevisionId;

          return (
            <button
              key={rev.id}
              onClick={() => onSelectRevision(rev)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  : "border-border bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1 pr-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    v{rev.revision_number}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                    {rev.trigger_type}
                  </span>
                  {isActive && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <div className="text-xs font-medium text-foreground truncate">
                  {rev.change_reason || "Initial complaint path suggestion"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <Clock className="h-3 w-3" />
                  {new Date(rev.generated_at).toLocaleString()}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
