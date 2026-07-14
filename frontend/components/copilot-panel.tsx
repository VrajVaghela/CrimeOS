"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Send, HelpCircle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SourceChip } from "@/components/source-chip";
import { getCopilotChat, askCopilot, ApiError } from "@/lib/api";
import type { CopilotMessageOut } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface CopilotPanelProps {
  caseId: string;
}

export function CopilotPanel({ caseId }: CopilotPanelProps) {
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

  const handleAsk = async (text: string) => {
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
      cited_source_ids: [],
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optUserMsg]);

    try {
      const resp = await askCopilot(caseId, text);
      setMessages((prev) => [...prev, resp]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to get response from copilot");
      const errAssistantMsg: CopilotMessageOut = {
        id: Math.random().toString(),
        case_id: caseId,
        user_id: null,
        role: "assistant",
        message: "No grounded answer found. Please verify your query or check back later.",
        cited_source_ids: [],
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errAssistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    { label: "Suggested Next Actions", query: "What is the next best action for this case?" },
    { label: "Check Missing Facts", query: "What facts or information are currently missing or unverified?" },
    { label: "Explain Case Evidence", query: "Can you explain the evidence in this case?" },
    { label: "Review Legal Basis", query: "What is the legal basis for the applied sections?" },
    { label: "Analyze Provider Responses", query: "What do the provider responses reveal?" },
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
              <strong key={idx} className="text-white font-semibold">
                {part}
              </strong>
            ) : (
              part
            )
          );
        }
      }
      return (
        <p key={i} className="mb-2 leading-relaxed text-slate-300 text-sm font-sans">
          {content}
        </p>
      );
    });
  };

  return (
    <Card className="border border-border/60 bg-card/40 backdrop-blur-md flex flex-col h-[600px] relative overflow-hidden rounded-xl">
      <CardHeader className="border-b border-border/40 pb-4 bg-card/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <CardTitle className="text-base font-semibold font-heading flex items-center gap-2 text-white">
                Case Intelligence Copilot / केस इंटेलिजेंस कोपायलट
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Case-scoped AI assistant grounded in complaint files, legal sections, and SOPs.
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded-full font-mono">
            Read-Only State
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-transparent">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs font-mono text-muted-foreground">Loading case intelligence chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <HelpCircle className="h-10 w-10 text-muted-foreground opacity-50" />
            <div>
              <p className="text-sm font-semibold font-heading text-white">Ask anything about this case</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                The copilot has access to complaint translations, extracted entities, SOP grounding, legal sections, and provider answers.
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
                className={`p-3.5 rounded-xl text-sm border transition-all duration-200 ${
                  msg.role === "user"
                    ? "bg-primary/15 border-primary/30 text-white rounded-tr-none glow-primary"
                    : "bg-secondary/40 border-border/40 text-slate-300 rounded-tl-none relative pl-4"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary/70 rounded-l" />
                )}
                {formatMessageText(msg.message)}

                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/20">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                      Grounded Sources / प्रमाणित स्रोत
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cit) => (
                        <SourceChip
                          key={cit.id}
                          sourceType={cit.source_type}
                          sourceLabel={
                            cit.source_type === "sop_chunk"
                              ? "SOP Document"
                              : cit.source_type === "legal_section"
                              ? `Legal Section ${cit.locator || ""}`
                              : cit.source_type === "complaint"
                              ? "Complaint Text"
                              : cit.source_type === "entity"
                              ? "Case Entity"
                              : cit.source_type === "provider_row"
                              ? "Provider Response"
                              : cit.source_type === "evidence_marker"
                              ? "Evidence Marker"
                              : cit.source_type === "audit_event"
                              ? "Case History log"
                              : cit.source_type
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
                {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div className="flex flex-col max-w-[85%] mr-auto items-start">
            <div className="p-3.5 bg-secondary/40 border border-border/40 text-slate-400 rounded-xl rounded-tl-none relative pl-4 flex items-center gap-3">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary/70 rounded-l" />
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-mono text-muted-foreground">
                Copilot is analyzing case details ({elapsedTime}s)...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive max-w-[85%] mr-auto font-mono">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {!loading && (
        <div className="px-4 py-2 border-t border-border/20 bg-secondary/10 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
          {quickQuestions.map((qq, idx) => (
            <Button
              key={idx}
              onClick={() => void handleAsk(qq.query)}
              variant="outline"
              size="sm"
              className="text-xs border-border/30 hover:border-primary/40 hover:bg-primary/10 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground h-7"
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
          placeholder="Ask about SOP steps, legal basis, provider data, missing facts..."
          className="flex-1 bg-input border border-border/40 text-sm focus-visible:ring-primary rounded-lg text-white"
          disabled={loading || loadingHistory}
        />
        <Button
          onClick={() => void handleAsk(input)}
          disabled={loading || loadingHistory || !input.trim()}
          size="icon"
          className="bg-primary hover:bg-primary/80 glow-primary h-10 w-10 flex items-center justify-center rounded-lg transition-transform hover:scale-105"
        >
          <Send className="h-4 w-4 text-white" />
        </Button>
      </div>
    </Card>
  );
}
