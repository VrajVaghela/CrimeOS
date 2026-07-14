import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Noto_Sans_Gujarati } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-gujarati",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crime OS AI",
  description: "Agentic AI platform for intelligence-led police investigations",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${notoDevanagari.variable} ${notoGujarati.variable}`}
    >
      <body>
        <AuthProvider>
          {/* Hidden SVG defs for gradient IDs reused by chart components (Phase 9D/9F) */}
          <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
            <defs>
              <linearGradient id="gradient-accent-info-h" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dc0000" />
                <stop offset="100%" stopColor="#2d7ee9" />
              </linearGradient>
              <linearGradient id="gradient-accent-info-v" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc0000" />
                <stop offset="100%" stopColor="#2d7ee9" />
              </linearGradient>
              <linearGradient id="gradient-graph-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc0000" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#2d7ee9" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
