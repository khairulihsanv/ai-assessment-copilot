import Link from "next/link";
import { Brand } from "@/components/brand";

const points = [
  "AI menyusun draf skor per kriteria rubrik, lengkap dengan kutipan dari jawaban.",
  "Dosen menerima, mengubah, atau menolak setiap saran sebelum nilai dirilis.",
  "Mahasiswa hanya melihat nilai dan umpan balik yang sudah dirilis dosen.",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <Link href="/" aria-label="Dexa Assessment — beranda" className="self-start">
          <Brand />
        </Link>
        <div className="max-w-md">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Draf penilaian dari AI. Keputusan nilai dari dosen.
          </h1>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            {points.map((p) => (
              <li key={p} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Draf AI bukan nilai. Nilai adalah keputusan dosen.</p>
      </aside>

      <main id="main-content" className="flex flex-col px-4 py-8 sm:px-6">
        <Link href="/" aria-label="Dexa Assessment — beranda" className="self-start lg:hidden">
          <Brand />
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
