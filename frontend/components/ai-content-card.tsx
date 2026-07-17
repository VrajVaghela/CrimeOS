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
    <div className="rounded-squircle border border-info/30 bg-info/[0.04] p-5 transition-colors duration-200 hover:border-info/50">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-info" />
          <Badge variant="secondary" className="bg-info/10 text-info border-info/20 text-xs px-2 py-0.5 rounded-squircle-sm font-heading font-medium">
            {title}
          </Badge>
        </div>
        {children}
      </div>
    </div>
  );
}
