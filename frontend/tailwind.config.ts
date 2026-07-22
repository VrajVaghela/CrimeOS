import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        violet: {
          DEFAULT: "hsl(var(--violet))",
          foreground: "hsl(var(--violet-foreground))",
        },
        rose: {
          DEFAULT: "hsl(var(--rose))",
          foreground: "hsl(var(--rose-foreground))",
        },
        surface: {
          alt: "hsl(var(--surface-alt))",
          elevated: "hsl(var(--surface-elevated))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        xl: "var(--radius)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "var(--font-noto-devanagari)", "var(--font-noto-gujarati)", "sans-serif"],
        sans: ["var(--font-body)", "var(--font-noto-devanagari)", "var(--font-noto-gujarati)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        "noto-devanagari": ["var(--font-noto-devanagari)", "sans-serif"],
        "noto-gujarati": ["var(--font-noto-gujarati)", "sans-serif"],
      },

      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.5rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(0.5rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-0.5rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 12px -2px hsl(217 91% 60% / 0.4)" },
          "50%": { boxShadow: "0 0 28px 2px hsl(217 91% 60% / 0.7)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        "data-flow": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 300ms ease-out both",
        "fade-in": "fade-in 400ms ease-out both",
        "fade-down": "fade-down 300ms ease-out both",
        "scale-in": "scale-in 300ms ease-out both",
        "slide-in-right": "slide-in-right 300ms ease-out both",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "breathe": "breathe 2s ease-in-out infinite",
        "data-flow": "data-flow 3s linear infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "ping-slow": "ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
