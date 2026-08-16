"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  Send,
  HelpCircle,
  Loader2,
  ShieldAlert,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SourceChip } from "@/components/source-chip";
import { getCopilotChat, askCopilot, ApiError } from "@/lib/api";
import type { CopilotIntent, CopilotMessageOut } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { useFormatters } from "@/lib/format";
import { useEnumLabel } from "@/lib/i18n/enums";

interface CopilotPanelProps {
  caseId: string;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function CopilotPanel({
  caseId,
  onClose,
  isExpanded,
  onToggleExpand,
}: CopilotPanelProps) {
  const { t, lang } = useLanguage();
  const { formatTime } = useFormatters();
  const { label } = useEnumLabel();
  const [messages, setMessages] = useState<CopilotMessageOut[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChat = async () => {
    try {
      setLoadingHistory(true);
      const history = await getCopilotChat(caseId);
      setMessages(history);
    } catch (e) {
      console.error("Failed to load chat history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      void fetchChat();
    }
  }, [caseId]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading]);

  const handleAsk = async (text: string, intent?: CopilotIntent) => {
    if (!text.trim() || loading) return;
    setInput("");
    setError(null);
    setLoading(true);

    // Add user message optimistically
    const optUserMsg: CopilotMessageOut = {
      id: Math.random().toString(),
      case_id: caseId,
      user_id: null,
      role: "user",
      message: text,
      message_en: text,
      lang,
      cited_source_ids: [],
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optUserMsg]);

    try {
      const resp = await askCopilot(caseId, text, intent);
      setMessages((prev) => [...prev, resp]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("copilot.error_generic"));
      const errAssistantMsg: CopilotMessageOut = {
        id: Math.random().toString(),
        case_id: caseId,
        user_id: null,
        role: "assistant",
        message: t("copilot.error_no_answer"),
        message_en: t("copilot.error_no_answer"),
        lang,
        cited_source_ids: [],
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errAssistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Chips send a canonical intent so prompt routing never depends on the label's language
  const quickQuestions: { intent: CopilotIntent; label: string; query: string }[] = [
    { intent: "next_action", label: t("copilot.chip_next_action"), query: t("copilot.chip_next_action") },
    { intent: "missing_facts", label: t("copilot.chip_missing_facts"), query: t("copilot.chip_missing_facts") },
    { intent: "evidence", label: t("copilot.chip_evidence"), query: t("copilot.chip_evidence") },
    { intent: "legal_basis", label: t("copilot.chip_legal_basis"), query: t("copilot.chip_legal_basis") },
    {
      intent: "provider_response",
      label: t("copilot.chip_provider_response"),
      query: t("copilot.chip_provider_response"),
    },
  ];

  const renderFormattedInline = (text: string) => {
    // Parse inline code: `code`
    const codeSegments = text.split(/`([^`]+)`/g);
    return codeSegments.map((segment, segIdx) => {
      if (segIdx % 2 === 1) {
        return (
          <code
            key={segIdx}
            className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground border border-border/50 select-all"
          >
            {segment}
          </code>
        );
      }
      // Parse bold: **bold**
      const boldSegments = segment.split(/\*\*([^*]+)\*\*/g);
      return boldSegments.map((part, boldIdx) =>
        boldIdx % 2 === 1 ? (
          <strong key={`${segIdx}-${boldIdx}`} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        )
      );
    });
  };

  const formatMessageText = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul
            key={`list-${elements.length}`}
            className="my-2 space-y-1.5 pl-4 list-disc marker:text-info text-secondary-foreground text-xs font-sans"
          >
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }

      if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
        const itemContent = trimmed.replace(/^([*-\s]+|\d+\.\s+)/, "");
        currentList.push(
          <li key={`li-${i}`} className="leading-relaxed">
            {renderFormattedInline(itemContent)}
          </li>
        );
      } else {
        flushList();
        elements.push(
          <p
            key={`p-${i}`}
            className="leading-relaxed text-secondary-foreground text-xs font-sans mb-2 last:mb-0"
          >
            {renderFormattedInline(trimmed)}
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-card/95 backdrop-blur-md">
      {/* ── Header ────────────────────────────────────────── */}
      <CardHeader className="border-b border-border/60 bg-card/90 px-4 py-3.5 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info/10 text-info shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold font-heading truncate text-foreground tracking-tight">
              {t("copilot.title")}
            </CardTitle>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className="shrink-0 whitespace-nowrap text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider select-none bg-surface-alt text-muted-foreground border border-border/40"
          >
            {t("copilot.read_only")}
          </Badge>
          {onToggleExpand && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors cursor-pointer"
              aria-label={isExpanded ? "Collapse width" : "Expand width"}
              title={isExpanded ? "Collapse width" : "Expand width"}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors cursor-pointer"
              aria-label={t("common.close_copilot")}
              title={t("common.close_copilot")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* ── Chat Messages ─────────────────────────────────── */}
      <CardContent
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-transparent custom-scrollbar"
      >
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-info" />
            <span className="text-xs font-mono text-muted-foreground">
              {t("copilot.loading_history")}
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-semibold font-heading text-foreground">
                {t("copilot.empty_title")}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                {t("copilot.empty_sub")}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "ml-auto max-w-[85%] items-end" : "w-full items-start"
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-xs transition-colors duration-200 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground font-medium rounded-br-sm shadow-sm"
                    : "bg-surface-alt/70 text-foreground w-full rounded-2xl shadow-sm"
                }`}
              >
                {formatMessageText(msg.message)}

                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-border/40">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-info font-bold mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-info" />
                      {t("copilot.grounded_sources")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cit) => (
                        <SourceChip
                          key={cit.id}
                          sourceType={cit.source_type}
                          sourceLabel={
                            cit.source_type === "legal_section"
                              ? `${label("citations", "legal_section")} ${cit.locator || ""}`.trim()
                              : label("citations", cit.source_type)
                          }
                          locator={cit.locator || undefined}
                          confidence={cit.confidence || undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/60 font-mono mt-1 px-1">
                {formatTime(msg.created_at)}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div className="flex flex-col max-w-[85%] mr-auto items-start animate-fade-in">
            <div className="p-3 bg-surface-alt/70 text-secondary-foreground rounded-2xl flex items-center gap-2.5 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-info" />
              <span className="text-xs font-mono text-muted-foreground">
                {t("copilot.analyzing").replace("{seconds}", String(elapsedTime))}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive max-w-[90%] mr-auto font-mono">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* ── Suggested Actions Pill Bar ─────────────────────── */}
      {!loading && (
        <div className="px-4 py-2.5 border-t border-border/50 bg-surface-alt/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap shrink-0">
          {quickQuestions.map((qq) => (
            <button
              type="button"
              key={qq.intent}
              onClick={() => void handleAsk(qq.query, qq.intent)}
              className="text-xs px-3 py-1.5 border border-border/60 bg-card hover:bg-surface-elevated hover:text-foreground hover:border-border text-muted-foreground rounded-full flex-shrink-0 transition-all font-mono select-none active:scale-[0.98] cursor-pointer"
            >
              {qq.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Chat Input ────────────────────────────────────── */}
      <div className="p-3.5 border-t border-border/60 bg-card/90 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleAsk(input);
            }
          }}
          placeholder={t("copilot.placeholder")}
          aria-label={t("copilot.placeholder")}
          className="flex-1 bg-surface-alt/80 border border-border/70 text-sm focus-visible:ring-1 focus-visible:ring-info/50 rounded-xl h-10 px-3.5 placeholder:text-muted-foreground/60"
          disabled={loading || loadingHistory}
        />
        <Button
          onClick={() => void handleAsk(input)}
          disabled={loading || loadingHistory || !input.trim()}
          size="icon"
          aria-label={t("copilot.send")}
          title={t("copilot.send")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 flex items-center justify-center rounded-xl transition-all focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none shrink-0 disabled:opacity-40 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
