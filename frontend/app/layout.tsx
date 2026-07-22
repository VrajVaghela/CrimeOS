import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, IBM_Plex_Mono, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

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
  themeColor: "#0B0F19",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakartaSans.variable} ${outfit.variable} ${ibmPlexMono.variable} ${notoDevanagari.variable} ${notoGujarati.variable}`}
    >
        <body>
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
