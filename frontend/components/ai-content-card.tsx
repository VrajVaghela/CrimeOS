"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export interface AiContentCardProps {
  children: React.ReactNode;
  /** Omit to use the localized "AI-Suggested" default. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  hideHeader?: boolean;
}

export function AiContentCard({
  children,
  title,
  subtitle,
  headerRight,
  className,
  icon,
  hideHeader = false,
}: AiContentCardProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "rounded-squircle border border-info/30 bg-info/[0.04] p-5 transition-colors duration-200 hover:border-info/50",
        className,
      )}
    >
      {!hideHeader && (
        <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {icon ?? <Sparkles className="h-4 w-4 shrink-0 text-info" />}
              {title ? (
                typeof title === "string" ? (
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                ) : (
                  <div className="font-heading text-sm font-semibold text-foreground">
                    {title}
                  </div>
                )
              ) : (
                <Badge
                  variant="secondary"
                  className="rounded-squircle-sm border-info/20 bg-info/10 px-2 py-0.5 font-heading text-xs font-medium text-info"
                >
                  {t("common.ai_suggested")}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {headerRight && <div className="flex shrink-0 items-center gap-2">{headerRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
