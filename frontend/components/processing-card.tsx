"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";

interface ProcessingCardProps {
  label: string;
  startedAt: Date;
}

/**
 * In-flight AI analysis.
 *
 * Info Blue because the work being reported is machine work, and a live spinner
 * plus a real elapsed count because officers wait on this for tens of seconds and
 * need to know it has not stalled. The step list advances on elapsed time rather
 * than real progress, so it is framed as the pipeline's stages, not a percentage.
 */
export function ProcessingCard({ label, startedAt }: ProcessingCardProps) {
  const { t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const steps = [
    t("ingestion.step_transcribing"),
    t("ingestion.step_detecting"),
    t("ingestion.step_translating"),
    t("ingestion.step_extracting"),
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-5 rounded-squircle border border-info/30 bg-info/[0.04] p-5"
    >
      <div className="flex items-center gap-3">
        <Sparkles className="h-4 w-4 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
            {elapsed}s {t("common.elapsed").toLowerCase()}
            <span className="mx-1.5 text-muted-foreground/40">/</span>
            {t("ingestion.gemini_info")}
          </p>
        </div>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" />
      </div>

      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const reached = elapsed > i * 3;
          return (
            <li key={step} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500 ${
                  reached ? "bg-info" : "bg-border"
                }`}
              />
              <span
                className={`text-xs transition-colors duration-500 ${
                  reached ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2">
        {[80, 62, 71].map((w) => (
          <Skeleton key={w} className="h-3 rounded-full" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
