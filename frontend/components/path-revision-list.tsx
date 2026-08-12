"use client";

import React from "react";
import { GitBranch, Clock, ChevronRight } from "lucide-react";
import type { InvestigationPathOut } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";

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
  const { t } = useLanguage();
  const { formatDateTime } = useFormatters();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-heading text-sm font-semibold text-foreground">
          {t("revisions.title")}
        </h3>
      </div>
      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {revisions.map((rev) => {
          const isActive = rev.id === activeRevisionId;
          const isSelected = rev.id === selectedRevisionId;

          return (
            <button
              key={rev.id}
              type="button"
              onClick={() => onSelectRevision(rev)}
              aria-current={isSelected ? "true" : undefined}
              className={`flex w-full items-center justify-between rounded-squircle-sm border p-3 text-left transition-colors duration-200 ${
                isSelected
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-surface-alt hover:border-border/60"
              }`}
            >
              <div className="min-w-0 space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    v{rev.revision_number}
                  </span>
                  <span className="rounded border border-border/60 bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    {rev.trigger_type}
                  </span>
                  {isActive && (
                    <span
                      className="inline-flex h-1.5 w-1.5 rounded-full bg-success"
                      title={t("revisions.active")}
                    />
                  )}
                </div>
                <div className="truncate text-xs font-medium text-foreground">
                  {rev.change_reason || t("revisions.initial")}
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(rev.generated_at)}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
