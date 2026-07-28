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
        className="gap-1.5 text-xs text-info hover:text-info/80 h-7 px-2 border border-info/30 hover:bg-info/10 rounded-squircle-sm transition-colors duration-150"
        id="btn-view-sop"
      >
        <BookOpen className="h-3 w-3" />
        {triggerLabel}
      </Button>

      {/* Glass panel dialog over darkened blurred backdrop per Phase 9E spec */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-info/30 bg-card text-foreground animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold flex items-center gap-2.5">
              {/* Blue AI icon per Phase 9E spec */}
              <div className="rounded-squircle-sm bg-info/10 border border-info/30 p-1.5 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-info" />
              </div>
              SOP Grounding Source
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {title}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-squircle-sm bg-background border border-info/30 p-4">
            <p className="text-sm font-sans leading-relaxed text-foreground whitespace-pre-line">
              {sourceText}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
