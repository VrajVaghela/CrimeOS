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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs text-primary hover:text-primary/80 h-7 px-2 border border-primary/20 hover:bg-primary/5 rounded"
        id="btn-view-sop"
      >
        <BookOpen className="h-3 w-3" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass max-w-lg border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              SOP Grounding Source
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {title}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-lg bg-muted p-4 border border-border">
            <p className="text-sm font-sans leading-relaxed text-foreground whitespace-pre-line">
              {sourceText}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
