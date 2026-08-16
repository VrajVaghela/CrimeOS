"use client";

import React from "react";
import { Check, Circle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkflowStageOut } from "@/lib/types";
import { useEnumLabel } from "@/lib/i18n/enums";

interface WorkflowSpineProps {
  stages: WorkflowStageOut[];
  currentStage: string;
  onStageSelect?: (stage: string) => void;
}

/**
 * Where the case sits in its lifecycle.
 *
 * The rail is laid out in flow, not with absolutely-positioned labels over a
 * spacer div — the previous version put the labels in `absolute` boxes of a fixed
 * `w-32` and reserved room for them with a blank `h-10`, so a long stage name in
 * Hindi or Gujarati overlapped its neighbour and nothing about the container
 * reported the collision.
 */
export function WorkflowSpine({ stages, currentStage, onStageSelect }: WorkflowSpineProps) {
  const { label } = useEnumLabel();
  const interactive = Boolean(onStageSelect);

  return (
    <ol className="flex w-full flex-col gap-4 py-2 md:flex-row md:items-start md:gap-1">
      {stages.map((stage, index) => {
        const isActive = stage.stage === currentStage;
        const isCompleted = stage.is_completed;
        const isInProgress = stage.status === "in_progress" || isActive;
        const isSkipped = stage.status === "skipped";
        const isLast = index === stages.length - 1;

        let icon = <Circle className="h-2.5 w-2.5" />;
        let nodeClass = "border-border bg-card text-muted-foreground";

        if (isCompleted) {
          icon = <Check className="h-4 w-4 stroke-[3]" />;
          nodeClass = "border-success/50 bg-success/10 text-success";
        } else if (isInProgress) {
          icon = <Loader2 className="h-4 w-4 animate-spin" />;
          nodeClass = "border-info/60 bg-info/10 text-info";
        } else if (isSkipped) {
          icon = <Check className="h-3.5 w-3.5" />;
          nodeClass = "border-border bg-card text-muted-foreground/50";
        }

        return (
          <li
            key={stage.stage}
            className="flex min-w-0 flex-1 items-center gap-3 md:flex-col md:items-center md:gap-2"
          >
            <div className="flex items-center gap-0 md:w-full md:flex-1">
              {/* Leading half-connector, so the line meets the node from both
                  sides and the row stays symmetrical at every column count. */}
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px flex-1 md:block",
                  index === 0 ? "invisible" : isCompleted || isInProgress ? "bg-border" : "bg-border/50",
                )}
              />
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onStageSelect?.(stage.stage)}
                aria-current={isActive ? "step" : undefined}
                aria-label={label("workflow.stage", stage.stage)}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
                  nodeClass,
                  interactive ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : "cursor-default",
                )}
              >
                {icon}
              </button>
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px flex-1 md:block",
                  isLast ? "invisible" : isCompleted ? "bg-border" : "bg-border/50",
                )}
              />
            </div>

            <span
              className={cn(
                "min-w-0 text-sm font-medium leading-snug transition-colors duration-200 md:text-center md:text-xs",
                isActive
                  ? "text-foreground"
                  : isCompleted
                    ? "text-secondary-foreground"
                    : "text-muted-foreground",
              )}
            >
              {label("workflow.stage", stage.stage)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
