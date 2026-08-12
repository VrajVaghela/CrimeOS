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
      <Badge variant={variant} className="font-mono text-[10px] font-semibold">
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
              <TableHead className="w-[10%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.row_label")}
              </TableHead>
              <TableHead className="w-[30%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.raw_provider_data")}
              </TableHead>
              <TableHead className="w-[35%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.correlation_title")}
              </TableHead>
              <TableHead className="w-[15%] font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("responses.linked_path_step")}
              </TableHead>
              <TableHead className="w-[10%] text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                      <dl className="flex max-w-[320px] flex-col gap-1 overflow-hidden">
                        {Object.entries(corr.source_row).map(([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between gap-2 font-mono text-[11px] leading-none"
                          >
                            <dt className="uppercase text-muted-foreground">
                              {k.replace(/_/g, " ")}
                            </dt>
                            <dd className="truncate font-semibold text-foreground">{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-start gap-1.5">
                          {isFlagged ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          ) : (
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                          )}
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold leading-normal text-foreground">
                              {corr.reason}
                            </span>
                            {corr.matched_entity_value && (
                              <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                {t("responses.entity_match")}: {corr.matched_entity_value}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="pt-0.5">{renderConfidenceBadge(corr.confidence)}</div>
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
