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
        return <FileText className="h-3 w-3 text-blue-400 mr-1" />;
      case "provider_response":
      case "response":
        return <Database className="h-3 w-3 text-emerald-400 mr-1" />;
      case "ai":
      case "rag":
      case "sop":
        return <Sparkles className="h-3 w-3 text-amber-400 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 text-slate-400 mr-1" />;
    }
  };

  return (
    <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted border border-border text-[11px] font-mono text-muted-foreground transition-all hover:bg-slate-800 hover:text-foreground">
      {getIcon()}
      <span className="truncate max-w-[120px]">{sourceLabel}</span>
      {locator && <span className="text-muted-foreground/50 ml-1">:{locator}</span>}
      {confidence !== undefined && (
        <span
          className={`ml-1.5 font-bold ${
            confidence >= 0.85
              ? "text-emerald-400"
              : confidence >= 0.7
              ? "text-amber-400"
              : "text-rose-500"
          }`}
        >
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
