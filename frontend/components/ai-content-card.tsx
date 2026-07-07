"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiContentCardProps {
  children: React.ReactNode;
  title?: string;
}

export function AiContentCard({ children, title = "AI-Suggested" }: AiContentCardProps) {
  return (
    <div className="relative rounded-xl border border-primary/20 bg-card p-5 overflow-hidden transition-all duration-200 hover:border-primary/40 hover:glow-primary hover:-translate-y-0.5">
      {/* Sparkly left glow border */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-primary via-primary/50 to-primary/20" />
      
      <div className="pl-2">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5 rounded-full font-heading font-medium">
            {title}
          </Badge>
        </div>
        {children}
      </div>
    </div>
  );
}
