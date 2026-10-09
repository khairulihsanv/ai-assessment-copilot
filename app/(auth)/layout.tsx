import Link from "next/link";
import { Sparkles, ShieldCheck, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
                </span>
                <span className="font-mono text-xs text-[#1E4D3B] font-bold">
                  Human-in-the-Loop Active
                </span>
              </div>
            </div>

            {/* Editorial Lead */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-[#1E4D3B] uppercase tracking-widest font-bold">
                Learn today, succeed tomorrow!
              </p>
              <h1 className="font-display text-3xl xl:text-4xl font-extrabold text-[#111827] leading-tight tracking-tight">
                Kecerdasan Buatan untuk Evaluasi Akademik <span className="text-[#1E4D3B]">Presisi Tinggi.</span>
              </h1>
              <p className="text-sm text-[#4B5563] leading-relaxed max-w-xl">
                Memadukan kecepatan inferensi AI dengan pengawasan penuh tenaga pendidik. Hasil penilaian transparan, bebas halusinasi, dan sesuai rubrik kurikulum vokasional terstandar.
              </p>
            </div>

            {/* Mock Live Copilot Rubric Assessment Card */}
            <div className="bg-[#F9FAFB] rounded-2xl p-6 border border-[#E5E7EB] space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B] font-mono text-xs font-bold border border-[#C5DDD1]">
                    TUGAS-04
                  </span>
                  <span className="text-sm font-bold text-[#111827]">
                    Sistem Basis Data Terdistribusi
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#4B5563] font-mono bg-white px-3 py-1.5 rounded-full border border-[#E5E7EB]">
                  <ShieldCheck size={16} className="text-[#1E4D3B]" />
                  <span>Audit Trail Validated</span>
                </div>
              </div>

              {/* Rubric item analysis row */}
              <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">
                    Kriteria: Normalisasi Boyce-Codd (BCNF)
                  </span>
                  <span className="font-mono text-xs bg-[#FEF3C7] text-[#B45309] px-2.5 py-0.5 rounded-full font-bold">
                    Skor AI: 94 / 100
                  </span>
                </div>
                <p className="text-xs text-[#4B5563] italic leading-relaxed border-l-2 border-[#1E4D3B] pl-3">
                  "Argumen relasional mahasiswa valid. Anomali update telah diselesaikan dengan partisi tabel transaksional."
                </p>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-700 font-bold text-[11px]">Disetujui Dosen Penilai</span>
                    <span className="text-[#9CA3AF]">•</span>
                    <span className="font-mono text-[#6B7280] text-[11px]">Conf: 99.4%</span>
                  </div>
                  <span className="text-[#1E4D3B] font-bold text-xs">Bukti Anotasi Valid</span>
                </div>
              </div>
            </div>

            {/* Key Stats Mosaic (Dribbble 3 card colors!) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FEF3C7] p-4 rounded-2xl border border-[#FDE68A] text-slate-950 flex flex-col justify-between">
                <span className="font-display text-2xl font-extrabold text-[#B45309]">10x</span>
                <span className="text-[11px] text-[#78350F] mt-1 font-bold">Koreksi Cepat</span>
              </div>
              <div className="bg-[#E2EFE9] p-4 rounded-2xl border border-[#C5DDD1] text-slate-950 flex flex-col justify-between">
                <span className="font-display text-2xl font-extrabold text-[#1E4D3B]">100%</span>
                <span className="text-[11px] text-[#143528] mt-1 font-bold">Otonomi Dosen</span>
              </div>
              <div className="bg-[#EDE9FE] p-4 rounded-2xl border border-[#DDD6FE] text-slate-950 flex flex-col justify-between">
                <span className="font-display text-2xl font-extrabold text-[#7C3AED]">0%</span>
                <span className="text-[11px] text-[#5B21B6] mt-1 font-bold">Resiko Halusinasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Authentication Cockpit Card ─── */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E5E7EB] shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
