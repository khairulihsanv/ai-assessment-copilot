import { ArrowLeft, BookOpen, CheckCircle2, FileCheck2, ListChecks } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/dexa-logo.png" alt="" width={38} height={38} className="rounded-lg" />
          <span className="text-2xl font-semibold tracking-tight">dexa.</span>
        </Link>
        <div>
          <BookOpen size={40} strokeWidth={1.2} className="text-[#d9e6ad]" />
          <h1>
            Ruang untuk mengajar.
            <br />
            <span className="text-[#d9e6ad]">Waktu untuk memahami.</span>
          </h1>
          <p>
            Kelola kelas dan berikan umpan balik yang berarti. Asisten AI membantu membaca jawaban;
            keputusan akhir tetap milik Anda.
          </p>
          <div className="auth-steps">
            <ListChecks size={22} />
            <p>
              <strong>Rubrik yang jelas</strong>Setiap kriteria punya bobot.
            </p>
            <FileCheck2 size={22} />
            <p>
              <strong>Penilaian terarah</strong>Periksa saran, lalu rilis nilai.
            </p>
          </div>
        </div>
        <p className="mt-14 flex items-center gap-2 text-xs text-[#c3d0c6]">
          <CheckCircle2 size={15} /> Didesain untuk dosen dan mahasiswa.
        </p>
      </aside>
      <main id="main-content" className="auth-content">
        <div>
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Kembali ke beranda
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
