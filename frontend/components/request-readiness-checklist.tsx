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
    <section className="flex flex-col gap-3 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
            {t("readiness.title")}
          </h4>
          <p className="text-[11px] text-muted-foreground">{t("readiness.subtitle")}</p>
        </div>
        {readiness.is_ready ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" />
            {t("readiness.ready_badge")}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive">
            <ShieldAlert className="h-3 w-3" />
            {t("readiness.blocked_badge")}
          </span>
        )}
      </div>

      {!readiness.is_ready && (
        <Alert variant="destructive" className="py-2">
          <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
          <AlertTitle className="font-heading text-xs font-semibold">
            {t("readiness.incomplete_title")}
          </AlertTitle>
          <AlertDescription className="mt-0.5 text-[11px]">
            {interpolate(t("readiness.incomplete_desc"), { count: failedItems.length })}
          </AlertDescription>
        </Alert>
      )}

      <div className="divide-y divide-border/40">
        {readiness.items.map((item: ReadinessItem) => {
          const isPassed = item.status === "passed";
          const isWarning = item.status === "warning";
          const isFailed = item.status === "failed";

          return (
            <div
              key={item.key}
              className="flex flex-col justify-between gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {isPassed && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  {isWarning && <AlertTriangle className="h-3.5 w-3.5 text-warn" />}
                  {isFailed && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-heading text-xs font-semibold text-foreground">
                      {itemLabel(item)}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${
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
                  <p className="mt-0.5 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground">
                    {keyed(item.message_key, item.message, item.message_params)}
                  </p>

                  {item.fix && (
                    <div className="mt-1 max-w-[70ch] rounded-squircle-sm border border-warn/30 bg-warn/[0.06] px-2 py-1 text-[11px] text-warn">
                      <span className="font-semibold font-mono text-[9px] uppercase tracking-wider">{t("readiness.recommended_fix")}:</span>{" "}
                      {keyed(item.fix_key, item.fix)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {!isPassed && item.key !== "citation" ? (
                  item.key === "approval" ? (
                    <Button variant="outline" size="sm" onClick={onRoleApprovalClick} className="h-7 px-2.5 text-xs">
                      <Users className="h-3 w-3" />
                      {t("readiness.approve_draft")}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={onEditClick} className="h-7 px-2.5 text-xs">
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
