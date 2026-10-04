import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  ListChecks,
  Check,
  BookOpen,
  GraduationCap,
} from "lucide-react";
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-20 max-w-[1280px] items-center justify-between gap-4 px-6 lg:px-10">
          <Link href="/" aria-label="Dexa Assessment beranda" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
              d.
            </span>
            <span className="dexa-wordmark">
              dexa<span className="text-primary">.</span>
            </span>
            <span className="hidden border-l pl-3 text-xs tracking-wide text-muted-foreground sm:block">
              ASSESSMENT
            </span>
          </Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-3 text-sm sm:gap-7">
            <a
              href="#alur"
              className="hidden text-muted-foreground hover:text-foreground md:inline"
            >
              Cara kerja
            </a>
            <a
              href="#peran"
              className="hidden text-muted-foreground hover:text-foreground md:inline"
            >
              Untuk siapa
            </a>
            <details className="relative md:hidden">
              <summary className="min-h-11 cursor-pointer py-3 text-sm">Menu</summary>
              <div className="absolute right-0 top-12 z-30 w-44 rounded-lg border bg-card p-2">
                <a href="#alur" className="block rounded-md px-3 py-3 hover:bg-muted">
                  Cara kerja
                </a>
                <a href="#peran" className="block rounded-md px-3 py-3 hover:bg-muted">
                  Untuk siapa
                </a>
              </div>
            </details>
            <Link href="/login" className="dexa-link">
              Masuk <ArrowUpRight size={15} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <section className="mx-auto grid max-w-[1280px] gap-12 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-10 lg:py-24">
          <div>
            <p className="dexa-eyebrow mb-7 text-primary">Ruang kerja penilaian akademik</p>
            <h1 className="max-w-xl text-[44px] font-semibold leading-[1.12] tracking-[-.055em] sm:text-[60px]">
              Lebih fokus pada
              <br className="hidden sm:block" /> proses belajar.
              <br />
              <span className="text-primary">
                Bukan tumpukan
                <br className="hidden sm:block" /> koreksi.
              </span>
            </h1>
            <p className="mt-7 max-w-[460px] text-base leading-7 text-muted-foreground">
              Kelola tugas, tinjau jawaban dengan bantuan AI, dan berikan feedback yang berarti.
              Keputusan nilai tetap ada di tangan dosen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?role=DOSEN" className="dexa-link dexa-link-primary">
                Mulai sebagai dosen <ArrowRight size={17} />
              </Link>
              <Link href="/login?role=MAHASISWA" className="dexa-link">
                Masuk mahasiswa
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Check size={15} className="text-primary" />
              AI membantu meninjau. Dosen menentukan hasil.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks size={17} className="text-primary" />
                Meja koreksi
              </div>
              <span className="rounded border px-2 py-1 text-[11px] text-muted-foreground">
                Ilustrasi alur
              </span>
            </div>
            <div className="border-b bg-muted/50 px-6 py-5">
              <p className="dexa-eyebrow text-muted-foreground">Pemrograman web · Tugas 03</p>
              <h2 className="mt-2 text-lg font-semibold">Memahami validasi data</h2>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText size={15} />
                  01 / Jawaban mahasiswa
                </p>
                <p className="border-l-2 border-border pl-4 text-sm leading-6">
                  “Validasi dilakukan sebelum data disimpan, agar format dan kelengkapan input
                  sesuai aturan.”
                </p>
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">02 / Saran AI</span>
                  <span className="text-[11px] font-medium">Draf · perlu ditinjau</span>
                </div>
                <p className="mt-2 text-sm leading-6">
                  Konsep utama sudah disebutkan. Periksa apakah jawaban juga menjelaskan validasi di
                  sisi server.
                </p>
              </div>
              <div className="flex gap-3 border-t pt-5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Check size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">03 / Keputusan dosen</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Tinjau saran, sesuaikan feedback, lalu rilis nilai saat sudah siap.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-3 text-[11px] leading-5 text-muted-foreground">
              Contoh untuk menjelaskan alur, bukan hasil penilaian mahasiswa.
            </div>
          </div>
        </section>
        <section id="alur" className="border-y bg-card">
          <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-10">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="dexa-eyebrow mb-3 text-primary">Dari tugas hingga feedback</p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Satu alur. Kendali yang jelas.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Pekerjaan tersusun, saran dapat diperiksa, dan nilai akhir diputuskan manusia.
              </p>
            </div>
            <ol className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Siapkan tugas & acuan",
                  text: "Atur instruksi, rubrik, dan bahan penilaian sebelum memeriksa jawaban.",
                },
                {
                  title: "Tinjau jawaban & saran",
                  text: "Baca pekerjaan mahasiswa dan bandingkan saran AI dengan kriteria penilaian.",
                },
                {
                  title: "Berikan keputusan & feedback",
                  text: "Sesuaikan nilai dan umpan balik, lalu rilis hasil yang sudah Anda periksa.",
                },
              ].map((step, i) => (
                <li key={step.title} className="border-t pt-5">
                  <span className="font-mono text-sm text-primary">0{i + 1}</span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          id="peran"
          className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10"
        >
          <div>
            <p className="dexa-eyebrow mb-4 text-primary">Dua peran, satu ruang belajar</p>
            <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
              Jelas bagi penilai.
              <br />
              Bermakna bagi mahasiswa.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Bantuan AI tetap perlu diperiksa. Dexa menempatkan tinjauan dosen sebagai bagian dari
              proses penilaian.
            </p>
          </div>
          <div className="divide-y border-y">
            {[
              {
                role: "Dosen",
                icon: BookOpen,
                text: "Kelola kelas dan rubrik, periksa pengumpulan, lalu tetapkan nilai akhir.",
                href: "/register?role=DOSEN",
                cta: "Buat ruang kerja",
              },
              {
                role: "Mahasiswa",
                icon: GraduationCap,
                text: "Temukan tugas, kumpulkan jawaban, dan baca feedback yang sudah dirilis dosen.",
                href: "/register?role=MAHASISWA",
                cta: "Daftar mahasiswa",
              },
            ].map(({ role, icon: Icon, text, href, cta }) => (
              <article key={role} className="flex gap-5 py-7">
                <Icon size={22} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">{role}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  <Link
                    href={href}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    {cta}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-3 px-6 py-7 text-xs text-muted-foreground sm:flex-row lg:px-10">
          <p>
            <strong className="font-semibold text-foreground">Dexa Assessment</strong> · Ruang kerja
            penilaian akademik
          </p>
          <a href="#main-content" className="hover:text-foreground">
            Kembali ke atas ↑
          </a>
        </div>
      </footer>
    </div>
  );
}
