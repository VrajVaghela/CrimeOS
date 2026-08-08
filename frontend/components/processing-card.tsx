"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface ProcessingCardProps {
  label: string;
  startedAt: Date;
}

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

  return (
    <div className="glass rounded-xl p-6 flex flex-col gap-4 animate-fade-up relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-info via-violet to-primary" />
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
        </div>
        <div>
          <p className="font-heading font-semibold text-sm">{label}</p>
          {elapsed >= 5 ? (
            <p className="text-xs text-muted-foreground font-mono">
              {elapsed}s {t("ingestion.elapsed_suffix")} — {t("ingestion.ai_processing")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("ingestion.analyzing")}</p>
          )}
        </div>
        <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto" />
      </div>

      <div className="flex flex-col gap-2">
        {[
          t("ingestion.step_transcribing"),
          t("ingestion.step_detecting"),
          t("ingestion.step_translating"),
          t("ingestion.step_extracting"),
        ].map(
          (step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                  elapsed > i * 3 ? "bg-primary animate-pulse" : "bg-border"
                }`}
              />
              <p
                className={`text-xs transition-colors duration-500 ${
                  elapsed > i * 3 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step}
              </p>
            </div>
          )
        )}
      </div>

      {/* Skeleton rows */}
      <div className="flex flex-col gap-2 mt-1">
        {[80, 60, 70].map((w) => (
          <div
            key={w}
            className="h-3 rounded-full bg-muted animate-pulse"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Activity className="h-3 w-3" />
        {t("ingestion.gemini_info")}
      </div>
    </div>
  );
}
