"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CitationDialog } from "@/components/citation-dialog";
import { useAuth } from "@/lib/auth-context";
import type { PathStepOut, StepStatus } from "@/lib/types";

interface PathStepperProps {
  steps: PathStepOut[];
  caseId: string;
  onStatusChange: (stepId: string, status: StepStatus) => Promise<void>;
}

const STATUS_ICONS = {
  pending: Clock,
  in_progress: Play,
  done: Check,
  skipped: SkipForward,
};

const STATUS_CLASSES = {
  pending: "border-border text-muted-foreground bg-background",
  in_progress: "border-primary text-primary bg-background animate-glow-pulse glow-primary",
  done: "border-success text-success bg-background glow-success",
  skipped: "border-muted-foreground/30 text-muted-foreground bg-background",
};

export function PathStepper({ steps, caseId, onStatusChange }: PathStepperProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Sort steps by step_order just in case
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="relative ml-4 space-y-8">
      {sortedSteps.map((step, idx) => {
        const Icon = STATUS_ICONS[step.status] || Clock;
        const statusClass = STATUS_CLASSES[step.status] || STATUS_CLASSES.pending;
        const isLast = idx === sortedSteps.length - 1;

        // Determine connector line color based on step status
        let connectorColor = "bg-border/40";
        if (step.status === "done") {
          connectorColor = "bg-success/60";
        } else if (step.status === "in_progress") {
          connectorColor = "bg-primary/60";
        }

        return (
          <div key={step.id} className="relative pl-12 group">
            {/* Connector Line to next node */}
            {!isLast && (
              <div
                className={`absolute left-[15px] top-9 bottom-[-32px] w-[2px] transition-all duration-500 ${connectorColor}`}
              />
            )}

            {/* Step status node indicator */}
            <span
              className={[
                "absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs transition-all duration-300 font-mono z-10",
                statusClass,
              ].join(" ")}
            >
              {step.status === "done" ? <Check className="h-4 w-4" /> : step.step_order}
            </span>

            {/* Step Card */}
            <div className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Status Selector dropdown */}
                <div className="flex-shrink-0">
                  {user?.role === "IO" ? (
                    <select
                      value={step.status}
                      onChange={(e) => void onStatusChange(step.id, e.target.value as StepStatus)}
                      className="h-8 rounded bg-input border border-border px-2 text-xs font-mono text-foreground focus-visible:ring-1 focus-visible:ring-primary w-32 cursor-pointer"
                      id={`select-status-${step.id}`}
                    >
                      <option value="pending">PENDING</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="done">DONE</option>
                      <option value="skipped">SKIPPED</option>
                    </select>
                  ) : (
                    <span className="font-mono text-xs uppercase px-2 py-1 rounded bg-secondary border border-border text-muted-foreground">
                      {step.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Citations and actions row */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/30">
                <CitationDialog
                  title={`SOP Grounding for: ${step.title}`}
                  sourceText={step.sop_citation}
                />

                {/* Action button for money moment */}
                {step.suggested_action_type && user?.role === "IO" && (
                  <Button
                    onClick={() =>
                      router.push(
                        `/cases/${caseId}/requests?step_id=${step.id}&provider_type=${step.suggested_action_type}`
                      )
                    }
                    className="bg-primary text-primary-foreground font-medium text-xs h-8 px-3 rounded hover:scale-105 glow-primary transition-all duration-200 flex items-center gap-1.5"
                    id={`btn-action-${step.id}`}
                  >
                    <span>Generate {step.suggested_action_type.toUpperCase()} Request</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
