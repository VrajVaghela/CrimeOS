"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CitationDialogProps {
  title: string;
  sourceText: string;
  triggerLabel?: string;
}

export function CitationDialog({
  title,
  sourceText,
  triggerLabel = "View SOP Grounding",
}: CitationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Info-blue citation trigger button per Phase 9D spec */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs text-[#2d7ee9] hover:text-[#2d7ee9]/80 h-7 px-2 border border-[#2d7ee9]/30 hover:bg-[#2d7ee9]/8 rounded-[8px] transition-all duration-[130ms]"
        id="btn-view-sop"
      >
        <BookOpen className="h-3 w-3" />
        {triggerLabel}
      </Button>

      {/* Glass panel dialog over darkened blurred backdrop per Phase 9E spec */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong max-w-lg border-[#2d7ee9]/30 text-foreground backdrop-blur-xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold flex items-center gap-2.5">
              {/* Blue AI icon per Phase 9E spec */}
              <div className="rounded-[8px] bg-[#2d7ee9]/15 border border-[#2d7ee9]/30 p-1.5 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-[#2d7ee9]" />
              </div>
              SOP Grounding Source
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {title}
            </DialogDescription>
          </DialogHeader>
          {/* Info-blue left border per build_plan.md "wrap AI summary inside left-bordered info blue block" */}
          <div className="mt-4 rounded-[8px] bg-[#0f0f0f] border border-border p-4 border-l-2 border-l-[#2d7ee9]">
            <p className="text-sm font-sans leading-relaxed text-foreground whitespace-pre-line">
              {sourceText}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
