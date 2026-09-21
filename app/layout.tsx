import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, Geist } from "next/font/google";
import "./globals.css";
import { ThemeInitializer } from "@/components/theme-initializer";
import { QueryProvider } from "@/components/query-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Assessment Copilot",
    template: "%s | AI Assessment Copilot",
  },
  description:
    "Platform manajemen tugas & penilaian berbasis AI dengan pendekatan Human-in-the-Loop. Asisten AI membantu koreksi, keputusan akhir tetap di tangan dosen.",
  keywords: [
    "AI",
    "Assessment",
    "Grading",
    "Education",
    "Human-in-the-Loop",
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
      className={cn(spaceGrotesk.variable, dmSans.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <a href="#main-content" className="skip-to-content">
          Langsung ke konten utama
        </a>
        <ThemeInitializer />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
