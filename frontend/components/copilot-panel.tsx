"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Send, HelpCircle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
}

export function CopilotPanel({ caseId }: CopilotPanelProps) {
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Chips send a canonical intent so prompt routing never depends on the label's
  // language; the `query` is the natural-language question the officer "asked".
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

  const formatMessageText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={i} className="h-1.5" />;
      }

      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
      const rawText = isBullet ? trimmed.replace(/^[*-\s]+/, "") : line;

      const parts = rawText.split(/\*\*([^*]+)\*\*/g);
      const content = parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <strong key={idx} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        )
      );

      if (isBullet) {
        return (
          <div
            key={i}
            className="flex items-start gap-2 mb-1.5 last:mb-0 text-sm text-secondary-foreground font-sans break-words [overflow-wrap:anywhere]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-info/70 shrink-0 mt-1.5" />
            <span className="flex-1 min-w-0">{content}</span>
          </div>
        );
      }

      return (
        <p
          key={i}
          className="mb-2 last:mb-0 leading-relaxed text-secondary-foreground text-sm font-sans break-words [overflow-wrap:anywhere]"
        >
          {content}
        </p>
      );
    });
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-none border-0 bg-card/95 backdrop-blur-xl">
      <CardHeader className="border-b border-border/40 bg-card/80 backdrop-blur-md px-4 py-3.5 pr-12 shrink-0">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-squircle-sm bg-info/10 border border-info/20 shrink-0">
              <Sparkles className="h-4 w-4 text-info animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-semibold font-heading truncate text-foreground leading-tight">
                {t("copilot.title")}
              </CardTitle>
            </div>
          </div>
          <Badge className="shrink-0 whitespace-nowrap bg-secondary/80 text-muted-foreground border border-border/60 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider select-none">
            {t("copilot.read_only")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto minimal-scroll p-4 space-y-3.5 min-h-0 bg-transparent">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-info" />
            <span className="text-xs font-mono text-muted-foreground">{t("copilot.loading_history")}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-semibold font-heading text-foreground">{t("copilot.empty_title")}</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                {t("copilot.empty_sub")}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[88%] min-w-0 ${
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-3.5 rounded-squircle text-sm border overflow-hidden transition-colors duration-200 w-full break-words [overflow-wrap:anywhere] ${
                  msg.role === "user"
                    ? "bg-primary/10 border-primary/30 text-foreground rounded-tr-xs"
                    : "bg-info/5 border-info/30 text-secondary-foreground rounded-tl-xs relative"
                }`}
              >
                {formatMessageText(msg.message)}

                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-info/20">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-info mb-1.5 flex items-center gap-1">
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
          <div className="flex flex-col max-w-[88%] min-w-0 mr-auto items-start">
            <div className="p-3.5 bg-info/5 border border-info/30 text-secondary-foreground rounded-squircle rounded-tl-xs flex items-center gap-3 w-full">
              <Loader2 className="h-4 w-4 animate-spin text-info shrink-0" />
              <span className="text-xs font-mono text-muted-foreground truncate">
                {t("copilot.analyzing").replace("{seconds}", String(elapsedTime))}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-squircle text-xs text-destructive max-w-[88%] min-w-0 mr-auto font-mono break-words [overflow-wrap:anywhere]">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {!loading && (
        <div className="px-3.5 py-2 border-t border-border/30 bg-secondary/20 flex gap-1.5 overflow-x-auto rail-scroll whitespace-nowrap shrink-0">
          {quickQuestions.map((qq) => (
            <Button
              key={qq.intent}
              onClick={() => void handleAsk(qq.query, qq.intent)}
              variant="outline"
              size="sm"
              className="text-[11px] border-border/40 hover:border-info/40 hover:bg-info/10 hover:text-info rounded-full flex-shrink-0 text-muted-foreground h-7 px-3 transition-colors"
            >
              {qq.label}
            </Button>
          ))}
        </div>
      )}

      <div className="p-3.5 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleAsk(input);
            }
          }}
          placeholder={t("copilot.placeholder")}
          className="flex-1 bg-input border border-border/60 text-sm focus-visible:ring-primary rounded-squircle-sm h-10 px-3.5"
          disabled={loading || loadingHistory}
        />
        <Button
          onClick={() => void handleAsk(input)}
          disabled={loading || loadingHistory || !input.trim()}
          size="icon"
          aria-label={t("copilot.send")}
          title={t("copilot.send")}
          className="bg-primary hover:bg-primary/90 h-10 w-10 shrink-0 flex items-center justify-center rounded-squircle-sm transition-colors"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
