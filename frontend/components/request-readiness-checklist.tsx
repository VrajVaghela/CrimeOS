"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Edit, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  onRoleApprovalClick
}: RequestReadinessChecklistProps) {
  const { t } = useLanguage();
  const { statusLabel } = useEnumLabel();
  const failedItems = readiness.items.filter((item) => item.status === "failed");

  // The backend sends English `label`/`message`/`fix` (the authoritative audit text)
  // plus stable `*_key` suffixes. Render the keyed version and fall back to the
  // English string only when a key is absent or missing from the dictionaries.
  const keyed = (suffix: string | null, fallback: string, params?: Record<string, string> | null) => {
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
    <Card className="border border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading font-bold text-foreground">
              {t("readiness.title")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t("readiness.subtitle")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {readiness.is_ready ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30 glow-success font-heading">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("readiness.ready_badge")}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30 glow-destructive font-heading">
                <ShieldAlert className="h-3.5 w-3.5" />
                {t("readiness.blocked_badge")}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!readiness.is_ready && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-destructive-foreground">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <AlertTitle className="font-heading font-semibold text-sm">
              {t("readiness.incomplete_title")}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1">
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
              <div key={item.key} className="py-3.5 flex flex-col md:flex-row md:items-start justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isPassed && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isWarning && <AlertTriangle className="h-4 w-4 text-accent animate-pulse" />}
                    {isFailed && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground font-heading">
                        {itemLabel(item)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          isPassed
                            ? "bg-success/10 text-success"
                            : isWarning
                            ? "bg-accent/10 text-accent"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {keyed(item.message_key, item.message, item.message_params)}
                    </p>

                    {item.fix && (
                      <div className="mt-1.5 p-2 rounded-lg bg-muted/30 border border-border/50 max-w-xl">
                        <span className="text-[10px] font-bold text-accent uppercase block font-heading">
                          {t("readiness.recommended_fix")}
                        </span>
                        <p className="text-xs text-foreground mt-0.5">{keyed(item.fix_key, item.fix)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-start">
                  {!isPassed && item.key !== "citation" && (
                    <>
                      {item.key === "approval" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 border-primary/50 text-foreground hover:bg-primary/10"
                          onClick={onRoleApprovalClick}
                        >
                          <Users className="h-3 w-3" />
                          {t("readiness.approve_draft")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 border-primary/50 text-foreground hover:bg-primary/10"
                          onClick={onEditClick}
                        >
                          <Edit className="h-3 w-3" />
                          {t("readiness.fix_draft")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
