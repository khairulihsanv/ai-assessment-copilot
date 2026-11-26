import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";
import { ThemeInitializer } from "@/components/theme-initializer";
import { cn } from "@/shared/utils";

// Self-hosted variable fonts (latin subset, SIL OFL 1.1, see fonts/*-OFL.txt). next/font/google
// downloads from Google at build time, and Google started answering CI/Vercel builders with
// font URLs next/font cannot parse, which failed the production build.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: {
    default: "Dexa Assessment — koreksi tugas dengan draf AI, keputusan di tangan dosen",
    template: "%s | Dexa Assessment",
  },
  description:
    "Dexa Assessment membantu dosen mengoreksi tugas: AI menyusun draf nilai per kriteria rubrik beserta kutipan bukti, dosen yang memutuskan dan merilis nilai.",
  keywords: [
    "Dexa Assessment",
    "Human-in-the-Loop",
    "Evaluasi Akademik",
    "Rubrik Penilaian",
    "LMS",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn(inter.variable, jetbrainsMono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased bg-background text-foreground">
        <a href="#main-content" className="skip-to-content">
          Langsung ke konten utama
        </a>
        <ThemeInitializer />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
