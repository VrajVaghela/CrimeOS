"use client";

/**
 * Enum → dictionary-key mapping (Phase 14A).
 *
 * DB enum values (`in_progress`, `DISPATCHED`, `awaiting_response`, …) must never
 * reach the screen raw. Every enum resolves to a `status.*`, `workflow.stage.*`,
 * `roles.*` or `entity.type.*` dictionary key here.
 *
 * Unknown values degrade to a humanized form ("some_new_state" → "Some new state")
 * rather than throwing or rendering blank — a new backend state must not break a
 * demo, but the dev-mode missing-key warning in language-context will flag it.
 */

import { useCallback } from "react";
import { useLanguage, type TranslationKey } from "@/lib/language-context";

function humanize(raw: string): string {
  const spaced = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Normalizes a DB value to a dictionary key segment: "In Progress" → "in_progress". */
export function enumSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export type EnumNamespace =
  | "status"
  | "workflow.stage"
  | "roles"
  | "entity.type"
  | "citations"
  | "provider";

export interface EnumLabeller {
  /** Resolves `<namespace>.<slug>`, falling back to a humanized raw value. */
  label: (namespace: EnumNamespace, raw: string | null | undefined) => string;
  /** Shorthand for the `status` namespace — the most common case. */
  statusLabel: (raw: string | null | undefined) => string;
}

export function useEnumLabel(): EnumLabeller {
  const { t } = useLanguage();

  const label = useCallback(
    (namespace: EnumNamespace, raw: string | null | undefined): string => {
      if (!raw) return "—";
      const slug = enumSlug(raw);
      const key = `${namespace}.${slug}`;
      const resolved = t(key as TranslationKey);
      // t() returns the key itself when nothing matched in any dictionary.
      return resolved === key ? humanize(raw) : resolved;
    },
    [t]
  );

  const statusLabel = useCallback(
    (raw: string | null | undefined) => label("status", raw),
    [label]
  );

  return { label, statusLabel };
}
