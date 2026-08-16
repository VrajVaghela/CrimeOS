"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopilotPanel } from "@/components/copilot-panel";
import { useLanguage } from "@/lib/language-context";

interface CopilotLauncherProps {
  caseId: string;
}

export function CopilotLauncher({ caseId }: CopilotLauncherProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(480);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const toggleExpand = useCallback(() => {
    if (isExpanded) {
      setWidth(480);
      setIsExpanded(false);
    } else {
      const maxW = Math.min(window.innerWidth - 32, 860);
      setWidth(maxW);
      setIsExpanded(true);
    }
  }, [isExpanded]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = width;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const maxW = Math.min(window.innerWidth - 32, 960);
      const newWidth = Math.max(360, Math.min(startWidth + deltaX, maxW));
      setWidth(newWidth);
      if (newWidth >= 700) {
        setIsExpanded(true);
      } else if (newWidth <= 520) {
        setIsExpanded(false);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <>
      {!open && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 z-30 h-11 w-11 rounded-squircle-sm border-info/50 bg-card text-info shadow-none transition-colors hover:bg-info/10 hover:text-info focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
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
            className="fixed inset-0 z-40 cursor-default bg-background/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setOpen(false)}
            aria-label={t("common.close_copilot")}
          />
          <aside
            style={{ width: `${width}px` }}
            className={`fixed top-3 bottom-3 right-3 z-50 max-w-[calc(100vw-24px)] animate-slide-in-right rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden ${
              isDragging ? "select-none" : "transition-[width] duration-200 ease-out"
            }`}
            aria-label={t("copilot.title")}
            role="dialog"
            aria-modal="true"
          >
            {/* Left Resize Drag Handle */}
            <div
              onPointerDown={handlePointerDown}
              className="group absolute -left-2 top-0 bottom-0 z-30 w-4 cursor-col-resize select-none flex items-center justify-center touch-none"
              title="Drag to resize width / Double-click to toggle expand"
              onDoubleClick={toggleExpand}
            >
              <div className="h-12 w-1.5 rounded-full bg-border/80 group-hover:bg-info group-hover:scale-y-125 transition-all group-active:bg-info shadow-sm" />
            </div>

            <CopilotPanel
              caseId={caseId}
              onClose={() => setOpen(false)}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
            />
          </aside>
        </>
      )}
    </>
  );
}
