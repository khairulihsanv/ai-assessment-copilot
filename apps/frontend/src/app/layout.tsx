import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";
import { ThemeInitializer } from "@/components/theme-initializer";
import { cn } from "@/shared/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
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
