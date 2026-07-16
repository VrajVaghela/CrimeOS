import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Cyberpunk dark theme design tokens
        cyber: {
          bg: "#0a0e1a",
          surface: "#111827",
          border: "#1e293b",
          cyan: "#06b6d4",
          magenta: "#d946ef",
          green: "#22c55e",
          orange: "#f97316",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;
