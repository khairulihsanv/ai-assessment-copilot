import { auth } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import { BookMarked, ShieldCheck, Cpu, Terminal, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Dokumentasi & Etika AI — AI Assessment Copilot",
};

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6 pb-12 max-w-4xl animate-in fade-in-50 duration-300">
      <div className="pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            Academic Standards
          </span>
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            UNS Ethical AI Framework
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mt-1.5 flex items-center gap-2.5">
          <BookMarked className="text-primary" size={28} />
          <span>Dokumentasi Sistem & Pedoman Etika AI</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Panduan komprehensif arsitektur Human-in-the-Loop, integrasi rubrik analitis, dan transparansi akademik.
        </p>
      </div>

      <div className="space-y-6 text-xs text-muted-foreground leading-relaxed">
        {/* Section 1: HITL */}
        <div className="p-7 rounded-xl bg-card border border-border shadow-none space-y-3.5">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-primary" />
            <span>Prinsip Dasar Human-in-the-Loop</span>
          </h2>
          <p>
            AI Assessment Copilot dirancang dengan arsitektur <strong className="text-foreground">Human-in-the-Loop (HITL)</strong> ketat. Mesin kecerdasan buatan bertindak semata-mata sebagai instrumen asistensi inferensi klerikal untuk membaca, mengekstrak argumen, dan memetakan kepatuhan rubrik kriteria.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Kewenangan penetapan nilai 100% mutlak berada di tangan dosen pengampu mata kuliah.</li>
            <li>Saran skor dan catatan naratif AI berstatus rekomendasi sementara yang dapat diubah, ditambah, maupun dibatalkan dosen.</li>
            <li>Mahasiswa hanya dapat melihat nilai akhir setelah diverifikasi dan disahkan secara eksplisit oleh dosen.</li>
          </ul>
        </div>

        {/* Section 2: OBE */}
        <div className="p-7 rounded-xl bg-card border border-border shadow-none space-y-3.5">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2.5">
            <Cpu size={20} className="text-primary" />
            <span>Penyusunan Rubrik Berbasis OBE (Outcome-Based Education)</span>
          </h2>
          <p>
            Rubrik terstruktur adalah kunci evaluasi objektif. Setiap rubrik di platform ini dipecah menjadi beberapa kriteria dengan persentase bobot total 100%, disertai deskriptor mutu capaian pada level:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px] pt-1">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-center">
              Sangat Baik (100%)
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-center">
              Baik (80%)
            </div>
            <div className="p-3 rounded-lg bg-muted text-muted-foreground font-bold text-center border border-border">
              Cukup (60%)
            </div>
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-center">
              Perlu Bimbingan (40%)
            </div>
          </div>
        </div>

        {/* Section 3: API & Code */}
        <div className="p-7 rounded-xl bg-card border border-border shadow-none space-y-3.5">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2.5">
            <Terminal size={20} className="text-primary" />
            <span>Spesifikasi API & Format Pengujian</span>
          </h2>
          <p>
            Untuk evaluasi tugas pemrograman teknis atau pengujian dataset CSV, AI mengekstrak keluaran berkas dan mengomparasi terhadap test suite otomatis:
          </p>
          <div className="p-4 bg-[#0F172A] text-[#38BDF8] rounded-lg font-mono text-[11px] overflow-x-auto">
            <code>
              {`POST /api/evaluations/batch-run\nContent-Type: text/csv\n\nstudent_id,submission_path,rubric_id,status\n2108561042,sarah_rb_tree.py,rubric-04,PENDING_REVIEW`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
