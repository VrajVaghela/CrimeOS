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
    return text.split("\n").map((line, i) => {
      let content: React.ReactNode = line;
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        content = <li className="ml-4 list-disc">{line.replace(/^[*-\s]+/, "")}</li>;
      } else {
        const parts = line.split(/\*\*([^*]+)\*\*/g);
        if (parts.length > 1) {
          content = parts.map((part, idx) =>
            idx % 2 === 1 ? (
              <strong key={idx} className="font-semibold text-foreground">
                {part}
              </strong>
            ) : (
              part
            )
          );
        }
      }
      return (
        <p key={i} className="mb-2 leading-relaxed text-secondary-foreground text-sm font-sans">
          {content}
        </p>
      );
    });
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-none border-0 bg-card/90 backdrop-blur-md">
      <CardHeader className="border-b border-border/40 bg-card/60 pb-3.5 pt-4 pl-4 pr-14">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="h-5 w-5 text-info shrink-0 animate-pulse" />
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold font-heading truncate text-foreground">
                {t("copilot.title")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate">
                {t("copilot.subtitle")}
              </CardDescription>
            </div>
          </div>
          <Badge className="shrink-0 whitespace-nowrap bg-secondary/60 text-muted-foreground border border-border/50 text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider select-none">
            {t("copilot.read_only")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-transparent">
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
              className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div
                className={`p-3.5 rounded-squircle text-sm border transition-colors duration-200 ${ msg.role === "user"
                    ? "bg-primary/10 border-primary/30 text-foreground rounded-tr-sm"
                    : "bg-info/5 border-info/30 text-secondary-foreground rounded-tl-sm relative"
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
          <div className="flex flex-col max-w-[85%] mr-auto items-start">
            <div className="p-3.5 bg-info/5 border border-info/30 text-secondary-foreground rounded-squircle rounded-tl-sm flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-info" />
              <span className="text-xs font-mono text-muted-foreground">
                {t("copilot.analyzing").replace("{seconds}", String(elapsedTime))}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-squircle text-xs text-destructive max-w-[85%] mr-auto font-mono">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {!loading && (
        <div className="px-4 py-2 border-t border-border/20 bg-secondary/10 flex gap-2 overflow-x-auto rail-scroll whitespace-nowrap">
          {quickQuestions.map((qq) => (
            <Button
              key={qq.intent}
              onClick={() => void handleAsk(qq.query, qq.intent)}
              variant="outline"
              size="sm"
              className="text-xs border-border/30 hover:border-info/40 hover:bg-info/10 hover:text-info rounded-full flex-shrink-0 text-muted-foreground h-7 transition-colors"
            >
              {qq.label}
            </Button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-border/40 bg-card/60 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleAsk(input);
            }
          }}
          placeholder={t("copilot.placeholder")}
          className="flex-1 bg-input border border-border/40 text-sm focus-visible:ring-primary rounded-squircle-sm"
          disabled={loading || loadingHistory}
        />
        <Button
          onClick={() => void handleAsk(input)}
          disabled={loading || loadingHistory || !input.trim()}
          size="icon"
          aria-label={t("copilot.send")}
          title={t("copilot.send")}
          className="bg-primary hover:bg-primary/90 h-10 w-10 flex items-center justify-center rounded-squircle-sm transition-colors"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
