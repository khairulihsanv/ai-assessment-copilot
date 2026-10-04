import Link from "next/link";
import { ArrowLeft, FileText, ListChecks, Check } from "lucide-react";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
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
