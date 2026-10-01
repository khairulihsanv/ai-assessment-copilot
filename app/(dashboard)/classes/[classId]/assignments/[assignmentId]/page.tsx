import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import {
  Calendar,
  Clock,
  ChevronLeft,
  FileText,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ExternalLink,
  Award,
  Layers,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionUploader } from "@/components/features/submission-uploader";
import { formatDate, formatDateTime, formatRelativeTime, getInitials } from "@/lib/utils";

interface AssignmentDetailPageProps {
  params: Promise<{ classId: string; assignmentId: string }>;
}

export const metadata = {
  title: "Detail Tugas & Evaluasi — AI Assessment Copilot",
};

export default async function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId, assignmentId } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    include: {
      class: {
        include: {
          dosen: { select: { id: true, name: true, email: true } },
          enrollments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      rubric: {
        include: { criteria: true },
      },
      submissions: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          grade: true,
          aiEvaluation: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const isDosen = assignment.class.dosenId === session.user.id;
  const isEnrolled = assignment.class.enrollments.some((e) => e.userId === session.user.id);

  if (!isDosen && !isEnrolled) {
    redirect("/classes");
  }

  const due = new Date(assignment.dueDate);
  const isPastDue = due.getTime() < Date.now();

  const studentSubmission = !isDosen
    ? assignment.submissions.find((s) => s.userId === session.user.id)
    : null;

  const totalEnrollments = assignment.class.enrollments.length;
  const submittedCount = assignment.submissions.length;
  const gradedCount = assignment.submissions.filter((s) => !!s.grade).length;
  const pendingCount = assignment.submissions.filter((s) => !s.grade).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#737686]">
        <Link href={`/classes/${classId}`} className="hover:text-[#004ac6] flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Kelas {assignment.class.name}</span>
        </Link>
      </div>

      {/* Header Info Banner (Google Classroom Style) */}
      <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#004ac6]">
              {assignment.class.name} ({assignment.class.subject || "Umum"})
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#434655]">
              Maks: {assignment.maxScore} Poin
            </span>
            {assignment.rubric && (
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#eaddff] text-[#25005a] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#6a1edb]" />
                Rubrik AI: {assignment.rubric.title}
              </span>
            )}
            {isPastDue && (
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a]">
                Tenggat Berakhir
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[#0b1c30]">
            {assignment.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-[#737686] flex-wrap">
            <div className={`flex items-center gap-1.5 ${isPastDue ? "text-[#ba1a1a] font-semibold" : ""}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Tenggat: {formatDateTime(due)} ({formatRelativeTime(due)})</span>
            </div>
            <span>•</span>
            <span>Pengajar: <strong>{assignment.class.dosen.name}</strong></span>
          </div>
        </div>

        {isDosen && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/classes/${classId}/rubrics`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#dce9ff] text-[#004ac6] text-xs font-bold hover:bg-[#eff4ff] transition shadow-xs"
            >
              <Layers className="w-4 h-4" />
              <span>Rubrik Kelas</span>
            </Link>
          </div>
        )}
      </div>

      {/* Dosen Metrics Strip (Clean & Compact) */}
      {isDosen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs">
            <span className="text-[11px] font-medium text-[#737686] block">Total Mahasiswa</span>
            <span className="font-display text-xl font-bold text-[#0b1c30]">
              {totalEnrollments} Mahasiswa
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs">
            <span className="text-[11px] font-medium text-[#737686] block">Terkumpul</span>
            <span className="font-display text-xl font-bold text-[#004ac6]">
              {submittedCount} Submisi
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs">
            <span className="text-[11px] font-medium text-[#737686] block">Perlu Evaluasi AI</span>
            <span className="font-display text-xl font-bold text-[#6a1edb]">
              {pendingCount} Berkas
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs">
            <span className="text-[11px] font-medium text-[#737686] block">Selesai Dinilai</span>
            <span className="font-display text-xl font-bold text-[#10b981]">
              {gradedCount} Berkas
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid: Instructions & Submissions (Left) + Rubric (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols Span) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instructions Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#e2e8f0] shadow-xs space-y-3">
            <h2 className="text-base font-bold font-display text-[#0b1c30] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#004ac6]" />
              <span>Instruksi Penugasan</span>
            </h2>
            <div className="text-xs sm:text-sm text-[#434655] leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          </div>

          {/* Student Graded Result Card (if graded) */}
          {!isDosen && studentSubmission?.grade && (
            <div className="p-6 rounded-2xl border border-[#d1fae5] bg-gradient-to-br from-[#f0fdf4] to-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#065f46] font-bold text-base font-display">
                  <Award className="w-5 h-5" />
                  <span>Nilai & Evaluasi Akhir</span>
                </div>
                <span className="bg-[#10b981] text-white font-mono text-base font-bold px-3 py-1 rounded-xl shadow-xs">
                  {studentSubmission.grade.finalScore} / {assignment.maxScore}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#d1fae5] space-y-1.5">
                <p className="text-[11px] font-bold text-[#737686] uppercase tracking-wider">
                  Umpan Balik Dosen Pengajar:
                </p>
                <p className="text-xs sm:text-sm text-[#0b1c30] whitespace-pre-wrap leading-relaxed">
                  {studentSubmission.grade.finalFeedback}
                </p>
              </div>

              <div className="text-xs text-[#737686] flex items-center justify-between pt-1">
                <span>Dinilai pada {formatDateTime(studentSubmission.grade.gradedAt)}</span>
                {studentSubmission.grade.isAIAssisted && (
                  <span className="text-[11px] text-[#6a1edb] flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Dibantu Asisten AI (Divalidasi Dosen)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Student Submission Uploader (if not graded) */}
          {!isDosen && !studentSubmission?.grade && (
            <SubmissionUploader
              classId={classId}
              assignmentId={assignmentId}
              allowedType={assignment.submissionType}
              existingSubmission={studentSubmission}
            />
          )}

          {/* DOSEN VIEW: Submissions List (Google Classroom / Teams Student Work View) */}
          {isDosen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-display text-[#0b1c30] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#004ac6]" />
                    <span>Daftar Pengumpulan Mahasiswa ({submittedCount} / {totalEnrollments})</span>
                  </h2>
                  <p className="text-xs text-[#737686]">
                    Klik &quot;Koreksi dengan AI&quot; untuk menjalankan analisis evaluasi cerdas otomatis.
                  </p>
                </div>
              </div>

              {assignment.submissions.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-[#dce9ff] bg-white space-y-2">
                  <Users className="w-8 h-8 text-[#737686] mx-auto" />
                  <p className="text-xs text-[#737686]">
                    Belum ada mahasiswa yang mengumpulkan tugas ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignment.submissions.map((sub) => {
                    const isLate = new Date(sub.submittedAt).getTime() > due.getTime();
                    const isGraded = sub.status === "GRADED";
                    const isAIReviewed = sub.status === "AI_REVIEWED";

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#cbdbf5] transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Student Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#004ac6] font-bold flex items-center justify-center text-xs font-mono shrink-0">
                            {getInitials(sub.user.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-[#0b1c30] truncate">
                                {sub.user.name}
                              </span>
                              {isLate && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#ffdad6] text-[#ba1a1a]">
                                  Terlambat
                                </span>
                              )}
                              <span className="font-mono text-[10px] px-2 py-0.2 rounded bg-[#f1f5f9] text-[#434655]">
                                {sub.type}
                              </span>
                            </div>
                            <p className="text-xs text-[#737686] mt-0.5 truncate">
                              {sub.fileName || "Esai teks"} • Diserahkan {formatRelativeTime(sub.submittedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Status & Action */}
                        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                          {/* Status Badge */}
                          {isGraded ? (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-[#d1fae5] text-[#065f46] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Nilai: {sub.grade?.finalScore}
                            </span>
                          ) : isAIReviewed ? (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-[#eaddff] text-[#25005a] flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#6a1edb]" />
                              Draft AI: {sub.aiEvaluation?.suggestedTotalScore ?? "-"}
                            </span>
                          ) : (
                            <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-[#f8f9ff] text-[#737686] border border-[#e2e8f0]">
                              Menunggu Koreksi
                            </span>
                          )}

                          {/* Action Button */}
                          <Link
                            href={`/classes/${classId}/assignments/${assignmentId}/submissions/${sub.id}`}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                              isGraded
                                ? "bg-white border border-[#e2e8f0] text-[#0b1c30] hover:bg-[#f8f9ff]"
                                : "bg-[#004ac6] text-white hover:bg-[#003ea8]"
                            }`}
                          >
                            <span>{isGraded ? "Lihat Nilai" : "Koreksi AI"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Rubric Details Sidebar */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#e2e8f0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <h3 className="font-bold font-display text-sm text-[#0b1c30] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#004ac6]" />
                <span>Pedoman Rubrik</span>
              </h3>
              {assignment.rubric && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#004ac6]">
                  {assignment.rubric.criteria.length} Kriteria
                </span>
              )}
            </div>

            {assignment.rubric ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#0b1c30]">
                  {assignment.rubric.title}
                </p>
                <div className="space-y-2.5">
                  {assignment.rubric.criteria.map((crit, idx) => (
                    <div
                      key={crit.id}
                      className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0b1c30]">
                          {idx + 1}. {crit.label}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#004ac6]">
                          {crit.weight}%
                        </span>
                      </div>
                      {crit.description && (
                        <p className="text-[11px] text-[#737686] leading-snug">
                          {crit.description}
                        </p>
                      )}
                      <div className="text-[10px] text-[#737686] font-mono pt-1">
                        Maksimal: {crit.maxScore} Poin
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#737686]">
                Tugas ini menggunakan rubrik standar berdasarkan instruksi tugas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
