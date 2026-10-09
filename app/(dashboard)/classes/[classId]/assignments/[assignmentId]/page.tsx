import { getClassAccess } from "@/lib/auth/class-access";
import {
  publicCriterionSelect,
  publicGradeSelect,
  withReleasedGrade,
} from "@/lib/db/public-selects";
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
  title: "Detail Tugas & Evaluasi — Dexa Assessment",
};

export default async function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId, assignmentId } = await params;
  const access = await getClassAccess(classId, session.user.id);
  if (!access) notFound();
  const canReview = access.isOwner || access.isAssistant;

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      classId,
      ...(canReview ? {} : { status: { not: "DRAFT" } }),
    },
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
        where: canReview ? {} : { userId: session.user.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          grades: canReview ? true : { where: { status: "RELEASED" }, select: publicGradeSelect },
          evaluations: canReview,
          versions: true,
        },
        orderBy: { createdAt: "desc" },
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
  const gradedCount = assignment.submissions.filter((s) => s.releasedGradeId).length;
  const pendingCount = assignment.submissions.filter((s) => !s.releasedGradeId).length;

  const releasedGrade =
    !isDosen && studentSubmission
      ? studentSubmission.grades.find(
          (g) => g.id === studentSubmission.releasedGradeId && g.status === "RELEASED",
        )
      : null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/classes/${classId}`} className="hover:text-primary flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Kelas {assignment.class.name}</span>
        </Link>
      </div>

      {/* Header Info Banner (Google Classroom Style) */}
      <div className="bg-card p-6 rounded-lg border border-border shadow-none flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-muted text-primary">
              {assignment.class.name} ({assignment.class.subject || "Umum"})
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#f1f5f9] text-[#434655]">
              Maks: {assignment.maxScore} Poin
            </span>
            {assignment.rubric && (
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#eaddff] text-[#25005a] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#6a1edb]" />
                Rubrik AI: {assignment.rubric.title}
              </span>
            )}
            {isPastDue && (
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#ffdad6] text-[#ba1a1a]">
                Tenggat Berakhir
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            {assignment.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <div
              className={`flex items-center gap-1.5 ${isPastDue ? "text-[#ba1a1a] font-semibold" : ""}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                Tenggat: {formatDateTime(due)} ({formatRelativeTime(due)})
              </span>
            </div>
            <span>•</span>
            <span>
              Pengajar: <strong>{assignment.class.dosen.name}</strong>
            </span>
          </div>
        </div>

        {isDosen && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/classes/${classId}/rubrics`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-primary text-xs font-bold hover:bg-muted transition shadow-none"
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
          <div className="p-4 rounded-lg bg-card border border-border shadow-none">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Total Mahasiswa
            </span>
            <span className="font-display text-xl font-bold text-foreground">
              {totalEnrollments} Mahasiswa
            </span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-none">
            <span className="text-[11px] font-medium text-muted-foreground block">Terkumpul</span>
            <span className="font-display text-xl font-bold text-primary">
              {submittedCount} Submisi
            </span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-none">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Perlu Evaluasi AI
            </span>
            <span className="font-display text-xl font-bold text-[#6a1edb]">
              {pendingCount} Berkas
            </span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-none">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Selesai Dinilai
            </span>
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
          <div className="p-6 rounded-lg bg-card border border-border shadow-none space-y-3">
            <h2 className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Instruksi Penugasan</span>
            </h2>
            <div className="text-xs sm:text-sm text-[#434655] leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          </div>

          {/* Student Graded Result Card (if graded) */}
          {!isDosen && releasedGrade && (
            <div className="p-6 rounded-lg border border-[#d1fae5] bg-gradient-to-br from-[#f0fdf4] to-white shadow-none space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#065f46] font-bold text-base font-display">
                  <Award className="w-5 h-5" />
                  <span>Nilai & Evaluasi Akhir</span>
                </div>
                <span className="bg-[#10b981] text-white font-mono text-base font-bold px-3 py-1 rounded-xl shadow-none">
                  {releasedGrade.finalScore} / {assignment.maxScore}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-card border border-[#d1fae5] space-y-1.5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Umpan Balik Dosen Pengajar:
                </p>
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {releasedGrade.finalFeedback}
                </p>
              </div>

              <div className="text-xs text-muted-foreground flex items-center justify-between pt-1">
                <span>Dinilai pada {formatDateTime(releasedGrade.createdAt)}</span>
                {releasedGrade.isAIAssisted && (
                  <span className="text-[11px] text-[#6a1edb] flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Dibantu Asisten AI (Divalidasi Dosen)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Student Submission Uploader (if not graded) */}
          {!isDosen && !releasedGrade && (
            <SubmissionUploader
              classId={classId}
              assignmentId={assignmentId}
              allowedType={assignment.submissionType}
              existingSubmission={
                studentSubmission?.versions.find(
                  (v: any) => v.id === studentSubmission.activeVersionId,
                ) ||
                studentSubmission?.versions[0] ||
                null
              }
            />
          )}

          {/* DOSEN VIEW: Submissions List (Google Classroom / Teams Student Work View) */}
          {isDosen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>
                      Daftar Pengumpulan Mahasiswa ({submittedCount} / {totalEnrollments})
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Klik &quot;Koreksi dengan AI&quot; untuk menjalankan analisis evaluasi cerdas
                    otomatis.
                  </p>
                </div>
              </div>

              {assignment.submissions.length === 0 ? (
                <div className="p-10 text-center rounded-lg border border-dashed border-border bg-card space-y-2">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Belum ada mahasiswa yang mengumpulkan tugas ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignment.submissions.map((sub) => {
                    const isLate = new Date(sub.createdAt).getTime() > due.getTime();
                    const activeVersion =
                      sub.versions.find((v) => v.id === sub.activeVersionId) || sub.versions[0];
                    const grade = sub.grades.find((g) => g.id === sub.releasedGradeId);
                    const isGraded = !!grade;
                    const aiEvaluation = sub.evaluations.find(
                      (e) => e.versionId === activeVersion?.id,
                    );
                    const isAIReviewed = !!aiEvaluation;

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-lg bg-card border border-border hover:border-[#cbdbf5] transition-all shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Student Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-muted text-primary font-bold flex items-center justify-center text-xs font-mono shrink-0">
                            {getInitials(sub.user.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                {sub.user.name}
                              </span>
                              {isLate && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#ffdad6] text-[#ba1a1a]">
                                  Terlambat
                                </span>
                              )}
                              <span className="font-mono text-[10px] px-2 py-0.2 rounded bg-[#f1f5f9] text-[#434655]">
                                {activeVersion?.type || "ANY"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {activeVersion?.fileName || "Esai teks"} • Diserahkan{" "}
                              {formatRelativeTime(sub.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Status & Action */}
                        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                          {/* Status Badge */}
                          {isGraded ? (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-[#d1fae5] text-[#065f46] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Nilai: {grade?.finalScore}
                            </span>
                          ) : isAIReviewed ? (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-[#eaddff] text-[#25005a] flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#6a1edb]" />
                              Draft AI: {aiEvaluation?.suggestedTotalScore ?? "-"}
                            </span>
                          ) : (
                            <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-muted text-muted-foreground border border-border">
                              Menunggu Koreksi
                            </span>
                          )}

                          {/* Action Button */}
                          <Link
                            href={`/classes/${classId}/assignments/${assignmentId}/submissions/${sub.id}`}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-none ${
                              isGraded
                                ? "bg-card border border-border text-foreground hover:bg-muted"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
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
          <div className="p-5 rounded-lg bg-card border border-border shadow-none space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold font-display text-sm text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Pedoman Rubrik</span>
              </h3>
              {assignment.rubric && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-primary">
                  {assignment.rubric.criteria.length} Kriteria
                </span>
              )}
            </div>

            {assignment.rubric ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-foreground">{assignment.rubric.title}</p>
                <div className="space-y-2.5">
                  {assignment.rubric.criteria.map((crit, idx) => (
                    <div
                      key={crit.id}
                      className="p-3 rounded-xl bg-muted border border-border space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {idx + 1}. {crit.label}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-primary">
                          {crit.weight}%
                        </span>
                      </div>
                      {crit.description && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {crit.description}
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground font-mono pt-1">
                        Maksimal: {crit.maxScore} Poin
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Tugas ini menggunakan rubrik standar berdasarkan instruksi tugas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
