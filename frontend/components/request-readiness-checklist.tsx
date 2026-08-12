"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Edit, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RequestReadinessOut, ReadinessItem } from "@/lib/types";
import { interpolate, useLanguage, type TranslationKey } from "@/lib/language-context";
import { useEnumLabel } from "@/lib/i18n/enums";

interface RequestReadinessChecklistProps {
  readiness: RequestReadinessOut;
  onEditClick?: () => void;
  onRoleApprovalClick?: () => void;
}

export function RequestReadinessChecklist({
  readiness,
  onEditClick,
  onRoleApprovalClick,
}: RequestReadinessChecklistProps) {
  const { t } = useLanguage();
  const { statusLabel } = useEnumLabel();
  const failedItems = readiness.items.filter((item) => item.status === "failed");

  // The backend sends English `label`/`message`/`fix` (the authoritative audit text)
  // plus stable `*_key` suffixes. Render the keyed version and fall back to the
  // English string only when a key is absent or missing from the dictionaries.
  const keyed = (
    suffix: string | null,
    fallback: string,
    params?: Record<string, string> | null,
  ) => {
    if (!suffix) return fallback;
    const key = `readiness.msg.${suffix}`;
    const resolved = t(key as TranslationKey);
    return resolved === key ? fallback : interpolate(resolved, params);
  };

  const itemLabel = (item: ReadinessItem) => {
    const key = `readiness.item_${item.key}`;
    const resolved = t(key as TranslationKey);
    return resolved === key ? item.label : resolved;
  };

  return (
    // A plain region, not a Card. This always renders inside a request Card, and
    // a card inside a card doubles the inset and reads as an unrelated panel.
    <section className="flex flex-col gap-4 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-heading text-sm font-semibold text-foreground">
            {t("readiness.title")}
          </h4>
          <p className="text-xs text-muted-foreground">{t("readiness.subtitle")}</p>
        </div>
        {readiness.is_ready ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("readiness.ready_badge")}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t("readiness.blocked_badge")}
          </span>
        )}
      </div>

      {!readiness.is_ready && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle className="font-heading text-sm font-semibold">
            {t("readiness.incomplete_title")}
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs">
            {interpolate(t("readiness.incomplete_desc"), { count: failedItems.length })}
          </AlertDescription>
        </Alert>
      )}

      <div className="divide-y divide-border/60">
        {readiness.items.map((item: ReadinessItem) => {
          const isPassed = item.status === "passed";
          const isWarning = item.status === "warning";
          const isFailed = item.status === "failed";

          return (
            <div
              key={item.key}
              className="flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 md:flex-row md:items-start"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isPassed && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {isWarning && <AlertTriangle className="h-4 w-4 text-warn" />}
                  {isFailed && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-semibold text-foreground">
                      {itemLabel(item)}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        isPassed
                          ? "bg-success/10 text-success"
                          : isWarning
                            ? "bg-warn/10 text-warn"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
                    {keyed(item.message_key, item.message, item.message_params)}
                  </p>

                  {item.fix && (
                    <div className="mt-1.5 max-w-xl rounded-squircle-sm border border-border/60 bg-surface-alt p-2">
                      <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-warn">
                        {t("readiness.recommended_fix")}
                      </span>
                      <p className="mt-0.5 text-xs text-secondary-foreground">
                        {keyed(item.fix_key, item.fix)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end md:self-start">
                {!isPassed && item.key !== "citation" ? (
                  item.key === "approval" ? (
                    <Button variant="outline" size="sm" onClick={onRoleApprovalClick}>
                      <Users className="h-3 w-3" />
                      {t("readiness.approve_draft")}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={onEditClick}>
                      <Edit className="h-3 w-3" />
                      {t("readiness.fix_draft")}
                    </Button>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
