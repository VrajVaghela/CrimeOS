"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopilotPanel } from "@/components/copilot-panel";
import { useLanguage } from "@/lib/language-context";

interface CopilotLauncherProps {
  caseId: string;
}

export function CopilotLauncher({ caseId }: CopilotLauncherProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 z-40 h-11 w-11 rounded-squircle-sm border-info/50 bg-card text-info shadow-none transition-colors hover:bg-info/10 hover:text-info"
          aria-label={t("common.open_copilot")}
          title={t("common.open_copilot")}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      )}

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-background/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setOpen(false)}
            aria-label={t("common.close_copilot")}
          />
          <aside
            className="fixed inset-y-3 right-3 z-50 flex flex-col w-[440px] max-w-[calc(100vw-1.5rem)] animate-slide-in-right rounded-squircle border border-border/80 bg-card/95 backdrop-blur-xl elev-overlay overflow-hidden"
            aria-label={t("copilot.title")}
            role="dialog"
            aria-modal="true"
          >
            <CopilotPanel caseId={caseId} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 h-8 w-8 rounded-squircle-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={t("common.close_copilot")}
            >
              <X className="h-4 w-4" />
            </Button>
          </aside>
        </>
      )}
    </>
  );
}
