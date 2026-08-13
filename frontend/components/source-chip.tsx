import React from "react";
import { FileText, Database, Sparkles, AlertCircle } from "lucide-react";

interface SourceChipProps {
  sourceType: string;
  sourceLabel: string;
  locator?: string;
  confidence?: number;
}

export function SourceChip({
  sourceType,
  sourceLabel,
  locator,
  confidence,
}: SourceChipProps) {
  const getIcon = () => {
    switch (sourceType.toLowerCase()) {
      case "complaint":
        return <FileText className="mr-1 h-3 w-3 text-info" />;
      case "provider_response":
      case "response":
        return <Database className="mr-1 h-3 w-3 text-success" />;
      case "ai":
      case "rag":
      case "sop":
        return <Sparkles className="mr-1 h-3 w-3 text-info" />;
      default:
        return <AlertCircle className="mr-1 h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="inline-flex max-w-full items-center rounded-squircle-sm border border-border bg-secondary/80 px-2 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:border-info/40 hover:text-foreground">
      {getIcon()}
      <span className="truncate max-w-[140px]">{sourceLabel}</span>
      {locator && <span className="truncate max-w-[100px] text-muted-foreground/60 ml-0.5">:{locator}</span>}
      {confidence !== undefined && (
        <span
          className={`ml-1.5 shrink-0 font-bold ${
            confidence >= 0.85
              ? "text-success"
              : confidence >= 0.7
                ? "text-warn"
                : "text-destructive"
          }`}
        >
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
