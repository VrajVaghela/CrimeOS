import React from "react";
import { AlertTriangle, ArrowRight, Play, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NextBestActionProps {
  actionType: string | null;
  actionLabel: string | null;
  blockerCodes: string[];
  onAction: (actionType: string) => void;
  disabled?: boolean;
}

export function NextBestAction({
  actionType,
  actionLabel,
  blockerCodes,
  onAction,
  disabled = false,
}: NextBestActionProps) {
  
  const getBlockerMessage = (code: string): string => {
    const mapping: Record<string, string> = {
      MISSING_COMPLAINT: "No complaints have been uploaded for this case yet. Please upload a complaint file (PDF/Audio/Image) to begin.",
      UNVERIFIED_ENTITIES: "Entities have been extracted from the complaint but not yet verified. Please review and save verified entities.",
      MISSING_PATH: "The complaint is ingested, but no investigation path has been generated. Please generate the AI investigation path.",
      NO_REQUESTS_DISPATCHED: "Investigation path steps are ready, but no legal requests have been drafted or dispatched. Please draft a request.",
      AWAITING_PROVIDER_RESPONSE: "Legal requests have been dispatched. Awaiting mock telecom/bank responses to proceed with response analytics.",
      MISSING_SUMMARY: "The response analytics are completed. Please generate the final case summary to close the investigation lifecycle.",
    };
    return mapping[code] ?? `Blocker: ${code}`;
  };

  const isCompleted = !actionType || actionType === "none";

  return (
    <div className="bg-primary/[0.06] border border-primary/25 rounded-squircle p-5 transition-colors duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold font-heading uppercase tracking-wider text-primary">
              Prioritized Next Action / अगला अनुशंसित कदम
            </h3>
          </div>

          {isCompleted ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <p className="text-sm font-medium">
                All main workflow stages completed! Final case summary generated.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold font-heading text-foreground">
                {actionLabel ?? "Proceed with Next Step"}
              </p>
              
              {blockerCodes.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-primary/10 pt-3">
                  {blockerCodes.map((code) => (
                    <div key={code} className="flex items-start gap-2 text-xs text-accent">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{getBlockerMessage(code)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!isCompleted && actionType && (
          <Button
            onClick={() => onAction(actionType)}
            disabled={disabled}
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 h-11 rounded-squircle-sm flex items-center gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Execute Action</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
