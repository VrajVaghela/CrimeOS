"use client";

import React from "react";
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage, type TranslationKey } from "@/lib/language-context";

interface NextBestActionProps {
  actionType: string | null;
  actionLabel: string | null;
  blockerCodes: string[];
  onAction: (actionType: string) => void;
  disabled?: boolean;
}

/**
 * The single most important thing to do on this case.
 *
 * The panel itself is a neutral surface: the red belongs to the button, which is
 * the action. A red-tinted wash behind a red button spends the screen's scarcest
 * signal on decoration and leaves the button nothing to stand out against.
 */
export function NextBestAction({
  actionType,
  actionLabel,
  blockerCodes,
  onAction,
  disabled = false,
}: NextBestActionProps) {
  const { t } = useLanguage();

  /** Backend blocker codes resolve to localized copy; an unknown code shows raw. */
  const blockerMessage = (code: string): string => {
    const key = `blockers.${code.toLowerCase()}` as TranslationKey;
    const resolved = t(key);
    return resolved === key ? code : resolved;
  };

  const isCompleted = !actionType || actionType === "none";

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3 rounded-squircle border border-success/30 bg-success/[0.04] px-5 py-4">
        <CheckCircle className="h-4 w-4 shrink-0 text-success" />
        <p className="text-sm font-medium text-foreground">
          {t("command_center.workflow_complete")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-squircle border border-border/80 bg-card p-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 max-w-[68ch] space-y-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("command_center.next_action")}
        </p>
        <p className="font-heading text-lg font-bold leading-snug tracking-[-0.01em] text-foreground">
          {actionLabel ?? t("command_center.next_action_fallback")}
        </p>

        {blockerCodes.length > 0 && (
          <ul className="space-y-1.5 border-t border-border/60 pt-3">
            {blockerCodes.map((code) => (
              <li key={code} className="flex items-start gap-2 text-xs leading-relaxed text-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{blockerMessage(code)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionType && (
        <Button
          onClick={() => onAction(actionType)}
          disabled={disabled}
          className="shrink-0 md:self-center"
        >
          {t("common.execute_action")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
