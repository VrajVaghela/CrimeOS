"use client";

/**
 * Locale-aware formatting helpers (Phase 14A).
 *
 * Rule: no component may hardcode a locale string such as "en-IN". All dates,
 * times and numbers route through here so a Gujarati session shows Gujarati
 * month names and digits grouping, not English ones.
 *
 * Usage:
 *   const { formatTime, formatDate } = useFormatters();
 *   <span>{formatTime(msg.created_at)}</span>
 *
 * The standalone functions are exported for non-hook contexts (e.g. sorting
 * helpers or server-safe utilities) where the locale is already known.
 */

import { useMemo } from "react";
import { useLanguage, type Lang } from "@/lib/language-context";

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTime(locale: string, value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(locale: string, value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(locale: string, value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(
  locale: string,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(locale: string, value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Relative time ("5 minutes ago") using Intl.RelativeTimeFormat, which is
 * localized for hi and gu by the browser — no dictionary keys needed.
 */
export function formatRelative(locale: string, value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const deltaSeconds = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(deltaSeconds);

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
  ];

  if (abs < 60) return rtf.format(deltaSeconds, "second");
  for (let i = 1; i < divisions.length; i += 1) {
    const [limit, unit] = divisions[i];
    if (abs < limit) {
      const prevLimit = divisions[i - 1][0];
      return rtf.format(Math.round(deltaSeconds / prevLimit), unit);
    }
  }
  return rtf.format(Math.round(deltaSeconds / 31557600), "year");
}

export interface Formatters {
  lang: Lang;
  locale: string;
  formatTime: (value: string | number | Date) => string;
  formatDate: (value: string | number | Date) => string;
  formatDateTime: (value: string | number | Date) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number) => string;
  formatRelative: (value: string | number | Date) => string;
}

/** Locale-bound formatters for the active language. */
export function useFormatters(): Formatters {
  const { lang, locale } = useLanguage();

  return useMemo(
    () => ({
      lang,
      locale,
      formatTime: (v) => formatTime(locale, v),
      formatDate: (v) => formatDate(locale, v),
      formatDateTime: (v) => formatDateTime(locale, v),
      formatNumber: (v, options) => formatNumber(locale, v, options),
      formatCurrency: (v) => formatCurrency(locale, v),
      formatRelative: (v) => formatRelative(locale, v),
    }),
    [lang, locale]
  );
}
