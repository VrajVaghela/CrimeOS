import type { DispatchEvent } from "../types/dispatch";
import type { LegalRequest } from "../types/legalRequest";

export const DISPATCH_STEPS = [
  "QUEUED",
  "SENT",
  "ACKNOWLEDGED",
  "RESPONDED",
] as const;

export type DispatchStep = (typeof DISPATCH_STEPS)[number];
export type StepState = "completed" | "current" | "pending";

/**
 * Maps a legal-request status to per-step visual states for the dispatch tracker.
 *
 * Status → step mapping:
 * - DRAFTED / REJECTED_BY_PROVIDER: all steps pending (pre-dispatch or terminal failure)
 * - QUEUED: step 0 (QUEUED) is current
 * - SENT: step 0 completed, step 1 (SENT) is current
 * - ACKNOWLEDGED: steps 0–1 completed, step 2 (ACKNOWLEDGED) is current
 * - RESPONDED: steps 0–2 completed, step 3 (RESPONDED) is current
 * - OVERDUE: returns `'overdue'` — caller renders an overdue badge instead of the happy-path tracker
 */
export function getDispatchStepStates(
  status: LegalRequest["status"]
): StepState[] | "overdue" {
  if (status === "OVERDUE") {
    return "overdue";
  }

  const statusToCurrentIndex: Record<string, number> = {
    DRAFTED: -1,
    QUEUED: 0,
    SENT: 1,
    ACKNOWLEDGED: 2,
    RESPONDED: 3,
    REJECTED_BY_PROVIDER: -1,
  };

  const currentIndex = statusToCurrentIndex[status] ?? -1;

  return DISPATCH_STEPS.map((_, index) => {
    if (currentIndex < 0) return "pending";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "pending";
  });
}

export interface DispatchTimelineProps {
  request: LegalRequest;
  dispatchEvents: DispatchEvent[];
}

const stepStyles: Record<StepState, string> = {
  completed: "bg-green-500 text-white border-green-500",
  current: "bg-blue-500 text-white border-blue-500 animate-pulse",
  pending: "bg-gray-100 text-gray-400 border-gray-300",
};

const connectorStyles: Record<StepState, string> = {
  completed: "bg-green-500",
  current: "bg-gray-300",
  pending: "bg-gray-300",
};

/**
 * Horizontal dispatch progress tracker for a single legal request.
 *
 * @see getDispatchStepStates for the exact status→step mapping used here.
 */
export function DispatchTimeline({
  request,
  dispatchEvents,
}: DispatchTimelineProps) {
  const stepStates = getDispatchStepStates(request.status);

  if (stepStates === "overdue") {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium text-red-800">
            {request.request_number}
          </span>
          <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
            OVERDUE
          </span>
        </div>
        <p className="text-sm text-red-700 mt-1">
          SLA deadline passed — provider response outstanding.
        </p>
        {dispatchEvents.length > 0 && (
          <p className="text-xs text-red-600 mt-2">
            Last event: {dispatchEvents[dispatchEvents.length - 1].event_name}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{request.request_number}</span>
        <span className="text-xs text-gray-500">{request.status}</span>
      </div>

      <div className="flex items-center">
        {DISPATCH_STEPS.map((step, index) => {
          const state = stepStates[index];
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${stepStyles[state]}`}
                  data-testid={`step-${step}`}
                  data-state={state}
                >
                  {index + 1}
                </div>
                <span className="text-xs mt-1 text-gray-600">{step}</span>
              </div>
              {index < DISPATCH_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    connectorStyles[
                      stepStates[index] === "completed" ? "completed" : "pending"
                    ]
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
