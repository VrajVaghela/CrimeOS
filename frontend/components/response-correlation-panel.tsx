"use client";
import { useLanguage } from "@/lib/language-context";
import React, { useState } from "react";
import { Sparkles, CheckCircle2, Bookmark, BookmarkCheck, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResponseCorrelationOut } from "@/lib/types";

interface ResponseCorrelationPanelProps {
  correlations: ResponseCorrelationOut[];
  onPromote: (rowIndex: number) => Promise<void>;
}

export function ResponseCorrelationPanel({ correlations, onPromote }: ResponseCorrelationPanelProps) {
  const { t } = useLanguage();
  const [promotingIndex, setPromotingIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; description: string; variant?: string } | null>(null);

  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    setToastMessage({ title, description, variant });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePromote = async (rowIndex: number) => {
    try {
      setPromotingIndex(rowIndex);
      await onPromote(rowIndex);
      toast({
        title: "Record Promoted",
        description: "Successfully promoted record to case diary and audit timeline.",
      });
    } catch (err: unknown) {
      toast({
        title: "Promotion Failed",
        description: err instanceof Error ? err.message : "Failed to promote record.",
        variant: "destructive",
      });
    } finally {
      setPromotingIndex(null);
    }
  };


  const renderConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let colorClass = "bg-destructive/10 text-destructive border-destructive/20";
    let label = t('command_center.low_confidence' as any) || 'Low Confidence';

    if (percentage >= 85) {
      colorClass = "bg-success/10 text-success border-success/20";
      label = t('command_center.high_confidence' as any) || 'High Confidence';
    } else if (percentage >= 70) {
      colorClass = "bg-accent/10 text-accent border-accent/20";
      label = t('command_center.medium_confidence' as any) || 'Medium Confidence';
    }

    return (
      <Badge variant="outline" className={`font-mono text-[10px] uppercase font-bold py-0.5 px-1.5 ${colorClass}`}>
        {percentage}% - {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <span className="text-sm font-semibold font-heading text-accent-strong uppercase tracking-wider">
          AI Correlation Engine
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[10%] text-xs font-heading font-semibold text-muted-foreground uppercase">
                Row
              </TableHead>
              <TableHead className="w-[30%] text-xs font-heading font-semibold text-muted-foreground uppercase">
                Raw Provider Data
              </TableHead>
              <TableHead className="w-[35%] text-xs font-heading font-semibold text-muted-foreground uppercase">
                AI Correlation & Grounding
              </TableHead>
              <TableHead className="w-[15%] text-xs font-heading font-semibold text-muted-foreground uppercase">
                Linked Path Step
              </TableHead>
              <TableHead className="w-[10%] text-xs font-heading font-semibold text-muted-foreground uppercase text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {correlations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No records to display.
                </TableCell>
              </TableRow>
            ) : (
              correlations.map((corr, idx) => {
                const isFlagged = corr.matched_entity_id !== null;
                return (
                  <TableRow
                    key={corr.id}
                    className={`transition-colors duration-150 ${
                      isFlagged
                        ? "bg-destructive/5 border-l-2 border-l-destructive hover:bg-destructive/10"
                        : "hover:bg-primary/5"
                    }`}
                  >
                    {/* Row Index */}
                    <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                      #{idx + 1}
                    </TableCell>

                    {/* Raw Provider Data */}
                    <TableCell>
                      <div className="space-y-1 max-w-[320px] overflow-hidden">
                        {Object.entries(corr.source_row).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2 text-[11px] font-mono leading-none">
                            <span className="text-muted-foreground uppercase">{k.replace(/_/g, " ")}:</span>
                            <span className="text-foreground truncate font-semibold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    {/* AI Correlation Explanation */}
                    <TableCell className="py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          {isFlagged ? (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="text-xs text-foreground font-semibold leading-normal block">
                              {corr.reason}
                            </span>
                            {corr.matched_entity_value && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/65 px-1.5 py-0.5 rounded mt-1 inline-block">
                                Entity Match: {corr.matched_entity_value}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="pt-0.5">{renderConfidenceBadge(corr.confidence)}</div>
                      </div>
                    </TableCell>

                    {/* Linked Step */}
                    <TableCell className="text-xs font-semibold font-heading text-muted-foreground">
                      {corr.linked_path_step_title}
                    </TableCell>

                    {/* Promote Action */}
                    <TableCell className="text-right">
                      {corr.is_promoted ? (
                        <div className="flex items-center justify-end gap-1 text-success text-[10px] font-bold font-heading uppercase mr-2">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Promoted
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={promotingIndex === idx}
                          onClick={() => handlePromote(idx)}
                          className="h-8 text-xs gap-1 border-primary/50 text-foreground hover:bg-primary/10 hover:glow-primary"
                        >
                          <Bookmark className="h-3 w-3 text-primary" />
                          Promote to Case
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

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl border glass shadow-2xl animate-fade-up flex flex-col gap-1 max-w-sm ${toastMessage.variant === 'destructive' ? 'border-destructive bg-destructive/10' : 'border-success/20 bg-background/90'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {toastMessage.variant === 'destructive' ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
            {toastMessage.title}
          </div>
          <div className="text-xs text-muted-foreground">{toastMessage.description}</div>
        </div>
      )}
    </div>
  );
}
