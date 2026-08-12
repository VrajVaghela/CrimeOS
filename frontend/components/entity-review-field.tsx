"use client";

import { useState } from "react";
import { Check, Edit3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ExtractedEntityOut } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { useEnumLabel } from "@/lib/i18n/enums";

interface EntityReviewFieldProps {
  entity: ExtractedEntityOut;
  onChange: (entityId: string, newValue: string) => Promise<void>;
}

export function EntityReviewField({ entity, onChange }: EntityReviewFieldProps) {
  const { t } = useLanguage();
  const { label } = useEnumLabel();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entity.value);
  const [saving, setSaving] = useState(false);
  const confidence = entity.confidence;
  const isHigh = confidence >= 0.85;
  const isMedium = confidence >= 0.7 && confidence < 0.85;
  const isLow = confidence < 0.7;

  const handleSave = async () => {
    if (value === entity.value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onChange(entity.id, value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={[
        "rounded-[8px] border bg-secondary p-3 transition-all duration-200",
        isLow
          ? "border-warn/50 bg-warn/[0.04]"
          : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label("entity.type", entity.entity_type)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={[
              "font-mono text-xs font-bold",
              isHigh ? "text-success" : "text-warn",
            ].join(" ")}
            title={`${t("common.confidence")}: ${Math.round(entity.confidence * 100)}%`}
          >
            {Math.round(entity.confidence * 100)}%
          </span>
          {isLow ? (
            <Badge
              className="bg-warn/15 text-warn border-warn/20 text-[10px] px-1.5 py-0 hover:bg-warn/20 rounded-squircle-sm"
              variant="outline"
            >
              {t("entity.badge_review")}
            </Badge>
          ) : isMedium ? (
            <Badge
              className="bg-warn/10 text-warn border-warn/20 text-[10px] px-1.5 py-0 hover:bg-warn/15 rounded-squircle-sm"
              variant="outline"
            >
              {t("entity.badge_medium")}
            </Badge>
          ) : (
            <Badge
              className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0 hover:bg-success/15 rounded-squircle-sm"
              variant="outline"
            >
              {t("entity.badge_verify")}
            </Badge>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
              if (e.key === "Escape") {
                setValue(entity.value);
                setEditing(false);
              }
            }}
            className="h-8 text-sm font-mono"
            autoFocus
            id={`entity-input-${entity.id}`}
          />
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-8 px-2"
            id={`entity-save-${entity.id}`}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 group">
          <span className="font-mono text-sm text-foreground break-all">{value}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            title={t("entity.edit_value")}
            id={`entity-edit-${entity.id}`}
          >
            <Edit3 className="h-3 w-3" />
            <span className="sr-only">{t("common.edit")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
