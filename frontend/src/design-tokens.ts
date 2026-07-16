/**
 * Design Tokens — Cyberpunk Investigation Dashboard Theme
 * =========================================================
 * Centralized design token definitions for the investigation dashboard.
 * Uses a cyberpunk-leaning dark theme with deep navy/black backgrounds
 * and neon cyan/magenta accents for risk badges and interactive elements.
 *
 * All color values are defined here — never scatter inline hex codes
 * across components.
 */

export const tokens = {
  colors: {
    // ── Background Layers ─────────────────────────────────────────────
    bgPrimary: "#0a0e1a", // Deep space navy
    bgSecondary: "#111827", // Elevated surface
    bgTertiary: "#1a2235", // Card backgrounds
    bgHover: "#1e293b", // Hover states

    // ── Borders ───────────────────────────────────────────────────────
    borderDefault: "#1e293b",
    borderAccent: "#2d3b52",
    borderFocus: "#06b6d4",

    // ── Text ──────────────────────────────────────────────────────────
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",

    // ── Accent Colors ─────────────────────────────────────────────────
    cyan: "#06b6d4",
    cyanGlow: "rgba(6, 182, 212, 0.3)",
    cyanDark: "#0891b2",
    magenta: "#d946ef",
    magentaGlow: "rgba(217, 70, 239, 0.3)",

    // ── Risk Level Badges ─────────────────────────────────────────────
    riskLow: "#22c55e",
    riskLowBg: "rgba(34, 197, 94, 0.15)",
    riskMedium: "#f97316",
    riskMediumBg: "rgba(249, 115, 22, 0.15)",
    riskHigh: "#ef4444",
    riskHighBg: "rgba(239, 68, 68, 0.15)",

    // ── Status Colors ─────────────────────────────────────────────────
    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.15)",
    warning: "#eab308",
    warningBg: "rgba(234, 179, 8, 0.15)",
    error: "#ef4444",
    errorBg: "rgba(239, 68, 68, 0.15)",
    info: "#3b82f6",
    infoBg: "rgba(59, 130, 246, 0.15)",
  },

  // ── Typography ──────────────────────────────────────────────────────
  fonts: {
    heading: "'Inter', 'Outfit', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },

  // ── Spacing ─────────────────────────────────────────────────────────
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },

  // ── Border Radius ───────────────────────────────────────────────────
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },

  // ── Shadows ─────────────────────────────────────────────────────────
  shadows: {
    card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
    elevated:
      "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
    glow: (color: string) => `0 0 20px ${color}, 0 0 40px ${color}`,
    innerGlow: (color: string) =>
      `inset 0 0 20px ${color}, 0 0 10px ${color}`,
  },

  // ── Animations ──────────────────────────────────────────────────────
  transitions: {
    fast: "150ms ease",
    default: "250ms ease",
    slow: "400ms ease",
  },
} as const;

/**
 * Get the appropriate risk level color based on the risk string.
 *
 * @param risk - Risk level string ("LOW", "MEDIUM", or "HIGH")
 * @returns Object with text color and background color
 */
export function getRiskColors(risk: string): {
  color: string;
  bg: string;
} {
  switch (risk.toUpperCase()) {
    case "LOW":
      return { color: tokens.colors.riskLow, bg: tokens.colors.riskLowBg };
    case "MEDIUM":
      return {
        color: tokens.colors.riskMedium,
        bg: tokens.colors.riskMediumBg,
      };
    case "HIGH":
      return { color: tokens.colors.riskHigh, bg: tokens.colors.riskHighBg };
    default:
      return { color: tokens.colors.textMuted, bg: "transparent" };
  }
}
