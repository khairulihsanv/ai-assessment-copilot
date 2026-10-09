import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeInitializer } from "@/components/theme-initializer";
import { QueryProvider } from "@/components/query-provider";
import { cn } from "@/lib/utils";

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
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Dexa Assessment | Intelligent Evaluation Platform",
    template: "%s | Dexa Assessment",
  },
  description:
    "Dexa Assessment — Platform manajemen tugas dan evaluasi akademik cerdas dengan AI berlandaskan filosofi Human-in-the-Loop.",
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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
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
