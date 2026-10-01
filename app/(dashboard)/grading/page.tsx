import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  User,
  School,
  ExternalLink,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = {
  title: "Studio Penilaian AI & Validasi Dosen — AI Assessment Copilot",
};

export default async function GradingStudioHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "DOSEN") {
    redirect("/dashboard");
  }

  const submissions = await prisma.submission.findMany({
    where: {
      assignment: { class: { dosenId: session.user.id } },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          classId: true,
          class: { select: { name: true, subject: true } },
          rubric: { select: { title: true } },
        },
      },
      grade: true,
      aiEvaluation: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const pendingSubmissions = submissions.filter((s) => !s.grade);
  const reviewedSubmissions = submissions.filter((s) => !!s.grade);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
              Human-in-the-Loop Studio
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
              v2.4-Turbo
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1.5 flex items-center gap-2.5">
            <Sparkles className="text-[#1E4D3B]" size={28} />
            <span>Studio Penilaian AI & Validasi</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl leading-relaxed">
            Periksa draf penilaian cerdas dari AI, sesuaikan nilai kriteria, dan validasi sebelum rilis resmi ke mahasiswa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 rounded-3xl bg-white border border-[#E5E7EB] text-right shadow-xs min-w-[140px]">
            <span className="font-mono text-[10px] font-bold text-[#6B7280] block uppercase tracking-wider mb-1">
              Menunggu Review
            </span>
            <span className="font-display text-2xl font-extrabold text-[#F59E0B]">
              {pendingSubmissions.length}{" "}
              <span className="text-xs font-semibold text-[#6B7280]">Submisi</span>
            </span>
          </div>
          <div className="p-4 rounded-3xl bg-[#E2EFE9] border border-[#C5DDD1] text-right shadow-xs min-w-[140px]">
            <span className="font-mono text-[10px] font-bold text-[#1E4D3B] block uppercase tracking-wider mb-1">
              Selesai Validasi
            </span>
            <span className="font-display text-2xl font-extrabold text-[#1E4D3B]">
              {reviewedSubmissions.length}{" "}
              <span className="text-xs font-semibold text-[#1E4D3B]/80">Submisi</span>
            </span>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4 pt-1">
        <h2 className="font-display text-base font-extrabold text-[#111827]">
          Antrean Penyerahan Tugas Mahasiswa
        </h2>

        {submissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {submissions.map((sub) => {
              const isGraded = !!sub.grade;
              return (
                <div
                  key={sub.id}
                  className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs hover:border-[#C5DDD1] hover:shadow-sm transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                        {sub.assignment.class.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-3 py-1 rounded-full border ${
                          isGraded
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {isGraded ? "✓ Nilai Resmi Rilis" : "Draft AI Siap Review"}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-[#111827] leading-snug">
                      {sub.assignment.title}
                    </h3>

                    <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
                      <div className="w-8 h-8 rounded-full bg-[#1E4D3B] text-white font-extrabold flex items-center justify-center text-[11px] shadow-2xs">
                        {sub.user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#111827]">{sub.user.name}</span>
                        <span className="text-[11px] text-[#6B7280]">{sub.user.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs">
                    <span className="text-[#6B7280] font-medium">
                      Diserahkan {formatRelativeTime(sub.submittedAt)}
                    </span>
                    <span className="font-mono font-bold text-[#1E4D3B] bg-white px-3 py-1 rounded-full border border-[#E5E7EB] shadow-2xs">
                      {isGraded
                        ? `Nilai: ${sub.grade?.finalScore}/${sub.assignment.maxScore}`
                        : `Maks: ${sub.assignment.maxScore}`}
                    </span>
                  </div>

                  <Link
                    href={`/classes/${sub.assignment.classId}/assignments/${sub.assignment.id}/submissions/${sub.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-full font-extrabold text-xs transition-all active:scale-[0.99] cursor-pointer ${
                      isGraded
                        ? "bg-white border border-[#E5E7EB] text-[#1E4D3B] hover:bg-[#E2EFE9] hover:border-[#C5DDD1] shadow-2xs"
                        : "bg-[#1E4D3B] hover:bg-[#15392C] text-white shadow-xs hover:shadow"
                    }`}
                  >
                    {!isGraded && <Sparkles size={14} className="text-[#FFA07A]" />}
                    <span>{isGraded ? "Lihat Hasil Koreksi" : "Buka Studio Penilaian"}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-[#E5E7EB] space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center mx-auto mb-2">
              <Sparkles size={30} className="text-[#1E4D3B]" />
            </div>
            <h3 className="font-display text-base font-extrabold text-[#111827]">
              Antrean Koreksi Kosong
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto leading-relaxed">
              Saat ini belum ada tugas baru yang dikumpulkan oleh mahasiswa. Anda dapat membuat tugas atau merilis rubrik baru.
            </p>
            <div className="pt-2">
              <Link
                href="/assignments"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold shadow-xs transition active:scale-[0.98]"
              >
                <span>Manajemen Tugas</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
