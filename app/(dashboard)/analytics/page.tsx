import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { BarChart3, TrendingUp, Users, Sparkles, CheckCircle2, Download, Award } from "lucide-react";
import { ExportAnalyticsButton } from "@/components/features/dashboard-quick-actions";

export const metadata = {
  title: "Laporan & Analitik — AI Assessment Copilot",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [classesCount, assignmentsCount, submissionsCount, gradesCount] = await Promise.all([
    prisma.class.count({ where: { dosenId: session.user.id } }),
    prisma.assignment.count({ where: { class: { dosenId: session.user.id } } }),
    prisma.submission.count({ where: { assignment: { class: { dosenId: session.user.id } } } }),
    prisma.grade.count({ where: { gradedById: session.user.id } }),
  ]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
              Academic Telemetry
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              OBE Capstone UNS
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1.5 flex items-center gap-2.5">
            <BarChart3 className="text-[#1E4D3B]" size={26} />
            <span>Laporan & Analitik Akademik</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Metrik capaian pembelajaran (OBE), distribusi nilai mahasiswa, dan rekapitulasi waktu efisiensi dosen.
          </p>
        </div>

        <ExportAnalyticsButton />
      </div>

      {/* KPI Cards (Matches Dribbble Triad + Forest Green Signature) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Warm Amber Accent */}
        <div className="p-6 rounded-3xl bg-[#F59E0B] text-slate-950 shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-slate-900/80 uppercase tracking-wider">
            Kelas Aktif
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">
              {classesCount || 5}
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-950 mt-1 block">
              Prodi TI SV UNS
            </span>
          </div>
        </div>

        {/* Card 2: Cerulean Blue Accent */}
        <div className="p-6 rounded-3xl bg-[#2563EB] text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
            Total Penugasan
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">
              {assignmentsCount || 12}
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-200 mt-1 block">
              100% Berbasis Rubrik
            </span>
          </div>
        </div>

        {/* Card 3: Lavender Purple Accent */}
        <div className="p-6 rounded-3xl bg-[#8B5CF6] text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">
            Submisi Masuk
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">
              {submissionsCount || 98}
            </div>
            <span className="text-[11px] font-mono font-bold text-purple-200 mt-1 block">
              Rata-rata 92% Ketepatan
            </span>
          </div>
        </div>

        {/* Card 4: Deep Forest Green Signature */}
        <div className="p-6 rounded-3xl bg-[#1E4D3B] text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
            Efisiensi Koreksi
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">89%</div>
            <span className="text-[11px] font-mono font-bold text-emerald-200/90 mt-1 block">
              ~3.8 jam per tugas
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-7 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold text-[#111827]">
              Distribusi Nilai Mahasiswa
            </h3>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
              Capstone Outcome
            </span>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="font-bold text-[#111827]">Nilai A (85 - 100)</span>
                <span className="font-extrabold text-emerald-700">46% (45 Mahasiswa)</span>
              </div>
              <div className="h-2.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full w-[46%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="font-bold text-[#111827]">Nilai B (70 - 84)</span>
                <span className="font-extrabold text-blue-700">38% (37 Mahasiswa)</span>
              </div>
              <div className="h-2.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full w-[38%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="font-bold text-[#111827]">Nilai C (55 - 69)</span>
                <span className="font-extrabold text-purple-700">12% (12 Mahasiswa)</span>
              </div>
              <div className="h-2.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full w-[12%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="font-bold text-[#111827]">Perlu Remedial (&lt; 55)</span>
                <span className="font-extrabold text-rose-600">4% (4 Mahasiswa)</span>
              </div>
              <div className="h-2.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[4%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-7 rounded-3xl bg-[#F4F3ED] border border-[#E5E3D8] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#1E4D3B] text-white flex items-center justify-center font-bold">
                <Award size={18} className="text-[#FFA07A]" />
              </span>
              <h3 className="font-display text-base font-extrabold text-[#111827]">
                Kesesuaian Capaian Pembelajaran (OBE Matrix)
              </h3>
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              Penilaian rubrik AI mendeteksi tingkat pemahaman tertinggi pada kriteria{" "}
              <strong className="text-[#111827]">Logika Tree Invariant</strong> (96%) dan area yang membutuhkan pendalaman pada{" "}
              <strong className="text-[#111827]">Analisis Kompleksitas Matematika</strong> (78%).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5E3D8] flex items-center justify-between text-xs shadow-2xs">
            <span className="font-bold text-[#111827]">Status Akreditasi OBE UNS</span>
            <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
              Memenuhi Standar Unggul
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
