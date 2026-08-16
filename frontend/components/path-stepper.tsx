"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CitationDialog } from "@/components/citation-dialog";
import { TranslatedTextBlock } from "@/components/translated-text-block";
import { useAuth } from "@/lib/auth-context";
import { useEnumLabel } from "@/lib/i18n/enums";
import { useLanguage, type TranslationKey } from "@/lib/language-context";
import type { PathStepOut, StepStatus } from "@/lib/types";

interface PathStepperProps {
  steps: PathStepOut[];
  caseId: string;
  onStatusChange: (stepId: string, status: StepStatus) => Promise<void>;
}

const STEP_STATUSES: StepStatus[] = ["pending", "in_progress", "done", "skipped"];

/** Node ring per status. Colour is the state; there is no pulse and no blur. */
const NODE_CLASSES: Record<StepStatus, string> = {
  pending: "border-border bg-card text-muted-foreground",
  // `in_progress` is Info Blue here, in the workflow spine, and in StatusBadge.
  // It used to be red in the stepper and blue in the badge, so the same state
  // read as two different things on one screen.
  in_progress: "border-info/60 bg-info/10 text-info",
  done: "border-success bg-success/10 text-success",
  skipped: "border-border bg-card text-muted-foreground/60",
};

/** Card border per status. The border shifts; the card never lifts or glows. */
const CARD_CLASSES: Record<StepStatus, string> = {
  pending: "border-border bg-card hover:border-border/60",
  in_progress: "border-info/40 bg-card",
  done: "border-success/30 bg-success/[0.03]",
  skipped: "border-border/60 bg-card opacity-75",
};

export function PathStepper({ steps, caseId, onStatusChange }: PathStepperProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { label: enumLabel } = useEnumLabel();

  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <ol className="relative ml-4 flex flex-col gap-6">
      {sortedSteps.map((step, idx) => {
        const status = (step.status ?? "pending") as StepStatus;
        const isLast = idx === sortedSteps.length - 1;
        const isDone = status === "done";

        return (
          <li key={step.id} className="relative pl-12">
            {/* Connector: the red-to-blue gradient marks a traversed path, which
                is a data path — the one place this system allows a gradient. */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute bottom-[-24px] left-[15px] top-9 w-0.5"
                style={{
                  background: isDone ? "var(--gradient-accent-info-v)" : "hsl(var(--border))",
                }}
              />
            )}

            <span
              aria-hidden="true"
              className={`absolute left-0 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-xs transition-colors duration-200 ${NODE_CLASSES[status]}`}
            >
              {isDone ? <Check className="h-4 w-4" /> : step.step_order}
            </span>

            <div
              className={`rounded-squircle border p-4 transition-colors duration-200 ${CARD_CLASSES[status]}`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 space-y-1">
                  <div className="font-heading text-base font-semibold text-foreground">
                    <TranslatedTextBlock content={step.title} />
                  </div>
                  <div className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                    <TranslatedTextBlock content={step.description} />
                  </div>
                </div>

                <div className="shrink-0">
                  {user?.role === "IO" ? (
                    <select
                      value={status}
                      onChange={(e) => void onStatusChange(step.id, e.target.value as StepStatus)}
                      className="h-8 w-36 cursor-pointer rounded-squircle-sm border border-border bg-input px-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      id={`select-status-${step.id}`}
                      aria-label={t("path.step_status")}
                    >
                      {STEP_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {enumLabel("status", value)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-squircle-sm border border-border bg-secondary px-2 py-1 font-mono text-xs uppercase text-muted-foreground">
                      {enumLabel("status", status)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                <CitationDialog title={step.title} sourceText={step.sop_citation} />

                {step.suggested_action_type && user?.role === "IO" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/cases/${caseId}/requests?step_id=${step.id}&provider_type=${step.suggested_action_type}`,
                      )
                    }
                    id={`btn-action-${step.id}`}
                  >
                    {t(
                      `requests.generate_${step.suggested_action_type.toLowerCase()}` as TranslationKey,
                    )}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
