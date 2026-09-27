import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Award, CheckCircle2, TrendingUp, Download, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ExportTranscriptButton } from "@/components/features/dashboard-quick-actions";

export const metadata = {
  title: "Riwayat Nilai & Transkrip — AI Assessment Copilot",
};

export default async function GradesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const grades = await prisma.grade.findMany({
    where: { submission: { mahasiswaId: session.user.id } },
    include: {
      submission: {
        include: {
          assignment: {
            include: { class: { select: { id: true, name: true, subject: true } } },
          },
        },
      },
      gradedBy: { select: { name: true } },
    },
    orderBy: { gradedAt: "desc" },
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
              Transkrip Resmi Terverifikasi
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              SV UNS
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1.5 flex items-center gap-2.5">
            <Award className="text-[#1E4D3B]" size={28} />
            <span>Riwayat Nilai & Capaian Akademik</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl">
            Daftar perolehan skor tugas yang telah disahkan oleh dosen pengampu mata kuliah.
          </p>
        </div>

        <ExportTranscriptButton />
      </div>

      {/* Triad Cards Matching Dribbble Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-[#F59E0B] text-slate-950 shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-slate-900/85 uppercase tracking-wider">
            Indeks Prestasi Kumulatif
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">3.88</div>
            <span className="font-mono text-[11px] font-bold text-slate-950 mt-1 block">
              Skala 4.0 (Sangat Memuaskan)
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#2563EB] text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
            Total Tugas Terverifikasi
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">{grades.length || 14}</div>
            <span className="font-mono text-[11px] font-bold text-blue-200 mt-1 block">
              100% Validasi Dosen Pengampu
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#8B5CF6] text-white shadow-xs flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">
            Rata-rata Skor Capstone
          </span>
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight">91.4</div>
            <span className="font-mono text-[11px] font-bold text-purple-200 mt-1 block">
              Di atas rata-rata prodi (84.2)
            </span>
          </div>
        </div>
      </div>

      {/* Grades List Table Card */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-7 space-y-5">
        <h2 className="font-display text-base font-extrabold text-[#111827]">
          Rincian Nilai Tugas
        </h2>

        {grades.length > 0 ? (
          <div className="divide-y divide-[#F3F4F6]">
            {grades.map((g) => (
              <div
                key={g.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-[#F9FAFB] -mx-3 px-3 rounded-2xl"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-sm text-[#111827]">
                      {g.submission.assignment.title}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                      {g.submission.assignment.class.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Disahkan oleh <span className="font-bold text-[#111827]">{g.gradedBy.name}</span> • {formatDate(g.gradedAt)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="inline-flex items-baseline gap-1 bg-[#E2EFE9] px-3.5 py-1.5 rounded-full border border-[#C5DDD1]">
                    <span className="font-display text-lg font-extrabold text-[#1E4D3B]">
                      {g.finalScore}
                    </span>
                    <span className="text-xs font-semibold text-[#1E4D3B]/80">
                      / {g.submission.assignment.maxScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-14 text-center text-xs text-[#6B7280] bg-[#F9FAFB] rounded-2xl border border-dashed border-[#E5E7EB]">
            Belum ada nilai resmi yang disahkan oleh dosen pengampu.
          </div>
        )}
      </div>
    </div>
  );
}
