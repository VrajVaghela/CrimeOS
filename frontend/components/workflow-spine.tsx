"use client";

import React from "react";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStageOut } from "@/lib/types";
import { useEnumLabel } from "@/lib/i18n/enums";

interface WorkflowSpineProps {
  stages: WorkflowStageOut[];
  currentStage: string;
  onStageSelect?: (stage: string) => void;
}

export function WorkflowSpine({ stages, currentStage, onStageSelect }: WorkflowSpineProps) {
  const { label } = useEnumLabel();

  return (
    <div className="w-full py-4 px-2">
      <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-4 md:gap-2">
        {/* Connection Line Behind (desktop only) */}
        <div className="absolute top-[22px] left-0 right-0 h-[2px] bg-border/40 hidden md:block z-0" />
        
        {stages.map((stage, index) => {
          const isActive = stage.stage === currentStage;
          const isCompleted = stage.is_completed;
          const status = stage.status;

          // Connectors colors
          const nextStage = stages[index + 1];
          const hasConnectedLine = nextStage !== undefined;

          // Determine node icon/style
          let icon = <Circle className="h-3 w-3" />;
          let nodeBg = "bg-muted text-muted-foreground border-border/40";
          
          if (isCompleted) {
            icon = <Check className="h-4 w-4 stroke-[3px]" />;
            nodeBg = "bg-success/10 text-success border-success/40";
          } else if (status === "in_progress" || isActive) {
            icon = <Loader2 className="h-4 w-4 animate-spin text-primary" />;
            nodeBg = "bg-primary/10 text-primary border-primary/40";
          } else if (status === "skipped") {
            icon = <Check className="h-4 w-4 text-muted-foreground" />;
            nodeBg = "bg-secondary text-muted-foreground border-border/20";
          }

          return (
            <button
              key={stage.stage}
              disabled={!onStageSelect}
              onClick={() => onStageSelect?.(stage.stage)}
              className={cn(
                "relative z-10 flex flex-col items-center group focus:outline-none w-full md:w-auto",
                onStageSelect ? "cursor-pointer" : "cursor-default"
              )}
            >
              {/* Node Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-full border-2 transition-all duration-300",
                  nodeBg,
                  isActive && "border-primary"
                )}
              >
                {icon}
              </div>

              {/* Text Labels — one language only; the backend `label_hi` field is
                  intentionally not rendered (Phase 14C, ui_rules rule 7). */}
              <div className="mt-2 text-center md:absolute md:top-12 md:left-1/2 md:-translate-x-1/2 md:w-32">
                <span
                  className={cn(
                    "block text-xs font-semibold font-heading tracking-wide transition-colors duration-200",
                    isActive ? "text-primary" : "text-foreground/80",
                    isCompleted && "text-success/90"
                  )}
                >
                  {label("workflow.stage", stage.stage)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Spacer for absolute positioned labels on desktop */}
      <div className="hidden md:block h-10" />
    </div>
  );
}
