"use client";

import React, { useState } from "react";
import { AlertTriangle, Bookmark, CheckCircle2, Sparkles } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/language-context";
import type { ResponseCorrelationOut } from "@/lib/types";

interface ResponseCorrelationPanelProps {
  correlations: ResponseCorrelationOut[];
  onPromote: (rowIndex: number) => Promise<void>;
}

const PRIORITY_KEYS = [
  "account_number",
  "account_no",
  "account",
  "phone_number",
  "phone",
  "mobile",
  "subscriber_number",
  "calling_number",
  "called_number",
  "call_duration",
  "duration",
  "duration_seconds",
  "amount",
  "transaction_amount",
  "timestamp",
  "datetime",
  "date",
  "time",
  "ip_address",
  "ip",
  "imei",
  "imsi",
  "location",
  "cell_id",
];

function getPrioritizedAttributes(sourceRow: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(sourceRow || {});
  if (entries.length <= 3) return entries;

  const sorted = [...entries].sort((a, b) => {
    const aLower = a[0].toLowerCase();
    const bLower = b[0].toLowerCase();
    const aIdx = PRIORITY_KEYS.findIndex((pk) => aLower.includes(pk));
    const bIdx = PRIORITY_KEYS.findIndex((pk) => bLower.includes(pk));
    const aScore = aIdx >= 0 ? aIdx : 999;
    const bScore = bIdx >= 0 ? bIdx : 999;
    return aScore - bScore;
  });

  return sorted.slice(0, 3);
}

export function ResponseCorrelationPanel({
  correlations,
  onPromote,
}: ResponseCorrelationPanelProps) {
  const { t } = useLanguage();
  const [promotingIndex, setPromotingIndex] = useState<number | null>(null);
  const { toast, show } = useToast();

  const handlePromote = async (rowIndex: number) => {
    try {
      setPromotingIndex(rowIndex);
      await onPromote(rowIndex);
      show({
        title: t("responses.promoted_title"),
        description: t("responses.promoted_desc"),
      });
    } catch (err: unknown) {
      show({
        title: t("responses.promote_failed_title"),
        description: err instanceof Error ? err.message : t("responses.promote_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setPromotingIndex(null);
    }
  };

  const renderConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    const variant =
      percentage >= 85 ? "success" : percentage >= 70 ? "warning" : "destructive";
    const label =
      percentage >= 85
        ? t("command_center.high_confidence")
        : percentage >= 70
          ? t("command_center.medium_confidence")
          : t("command_center.low_confidence");

    return (
      <Badge variant={variant} className="font-mono text-[10px] font-semibold py-0 px-1.5 rounded-sm">
        {percentage}% · {label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-info" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-info">
          {t("responses.correlation_engine")}
        </span>
      </div>

      <div className="overflow-hidden rounded-squircle border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[8%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.row_label")}
              </TableHead>
              <TableHead className="w-[30%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.raw_provider_data")}
              </TableHead>
              <TableHead className="w-[37%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.correlation_title")}
              </TableHead>
              <TableHead className="w-[13%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.linked_path_step")}
              </TableHead>
              <TableHead className="w-[12%] text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {correlations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {t("responses.no_records")}
                </TableCell>
              </TableRow>
            ) : (
              correlations.map((corr, idx) => {
                const isFlagged = corr.matched_entity_id !== null;
                const totalEntries = Object.keys(corr.source_row || {}).length;
                const prioritized = getPrioritizedAttributes(corr.source_row);

                return (
                  <TableRow
                    key={corr.id}
                    className={`transition-colors duration-150 ${
                      isFlagged ? "bg-destructive/[0.04]" : ""
                    }`}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </TableCell>

                    <TableCell>
                      <div className="flex max-w-[280px] flex-col gap-1">
                        {prioritized.map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center justify-between gap-2 font-mono text-[11px] leading-tight"
                          >
                            <span className="uppercase text-muted-foreground truncate font-medium text-[10px]">
                              {k.replace(/_/g, " ")}:
                            </span>
                            <span className="truncate font-semibold text-foreground max-w-[160px]" title={String(v)}>
                              {String(v)}
                            </span>
                          </div>
                        ))}
                        {totalEntries > 3 && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            +{totalEntries - 3} {t("responses.records")}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1.5 min-w-[240px]">
                        {/* Line 1: Icon + reason description */}
                        <div className="flex items-start gap-1.5">
                          {isFlagged ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                          ) : (
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
                          )}
                          <span className="text-xs font-semibold leading-snug text-foreground">
                            {corr.reason}
                          </span>
                        </div>

                        {/* Line 2: Entity match tag + confidence badge below */}
                        <div className="flex items-center gap-2 flex-wrap pl-5">
                          {corr.matched_entity_value && (
                            <span className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground border border-border/50">
                              <span className="text-muted-foreground">{t("responses.entity_match")}:</span>
                              <span className="font-semibold text-foreground">{corr.matched_entity_value}</span>
                            </span>
                          )}
                          {renderConfidenceBadge(corr.confidence)}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {corr.linked_path_step_title}
                    </TableCell>

                    <TableCell className="text-right">
                      {corr.is_promoted ? (
                        <span className="inline-flex items-center justify-end gap-1 font-mono text-[10px] font-semibold uppercase text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("responses.promoted")}
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={promotingIndex === idx}
                          loading={promotingIndex === idx}
                          onClick={() => handlePromote(idx)}
                          className="h-7 text-xs"
                        >
                          {promotingIndex !== idx && <Bookmark className="h-3 w-3" />}
                          {t("responses.promote_to_case")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Toast message={toast} />
    </div>
  );
}
