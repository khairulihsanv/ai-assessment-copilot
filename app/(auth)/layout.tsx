import Link from "next/link";
import { ArrowLeft, FileText, ListChecks, Check } from "lucide-react";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans relative overflow-hidden">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
        {/* ─── LEFT PANEL: Platform Showcase & Value Proposition ─── */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 xl:p-12 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col space-y-8">
            {/* Institutional Brand Header */}
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3.5 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0 overflow-hidden">
                  <img
                    src="/dexa-logo.png"
                    alt="Dexa Assessment"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <span className="font-display text-lg font-extrabold text-[#111827] block tracking-tight leading-none">
                    Dexa Assessment
                  </span>
                  <span className="text-[10px] font-mono text-[#1E4D3B] uppercase font-bold tracking-wider mt-1 block">
                    Intelligent Evaluation Hub
                  </span>
                </div>
              </Link>

              {/* Human-in-the-Loop badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E2EFE9] border border-[#C5DDD1]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E4D3B] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E4D3B]" />
=======
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <Link href="/" className="dexa-wordmark">
          dexa<span className="text-primary">.</span>
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Beranda
        </Link>
      </header>
      <main
        id="main-content"
        className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-12 lg:grid-cols-2 lg:gap-24 lg:py-10"
      >
        <section className="hidden lg:block">
          <p className="dexa-eyebrow mb-6 text-primary">Dexa Assessment</p>
          <h1 className="text-5xl font-semibold leading-[1.15] tracking-[-.04em]">
            Ruang untuk
            <br />
            penilaian yang
            <br />
            <span className="text-primary">lebih bermakna.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">
            Dari jawaban mahasiswa hingga feedback dosen, setiap langkah punya tempatnya.
          </p>
          <ol className="mt-10 space-y-5">
            {[
              { icon: FileText, text: "Tugas dan jawaban tersusun" },
              { icon: ListChecks, text: "Saran AI untuk ditinjau" },
              { icon: Check, text: "Nilai akhir ditetapkan dosen" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-primary">
                  <Icon size={17} />
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
                </span>
                {text}
              </li>
            ))}
          </ol>
        </section>
        <section className="auth-form rounded-xl border bg-card p-6 sm:p-9">{children}</section>
      </main>
    </div>
  );
}
