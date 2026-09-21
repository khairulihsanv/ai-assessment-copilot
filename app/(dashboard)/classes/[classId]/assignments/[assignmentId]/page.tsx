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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionUploader } from "@/components/features/submission-uploader";
import { formatDate, formatDateTime, formatRelativeTime, getInitials } from "@/lib/utils";

interface AssignmentDetailPageProps {
  params: Promise<{ classId: string; assignmentId: string }>;
}

export const metadata = {
  title: "Detail Tugas — Dexa Assessment",
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
              mahasiswa: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      rubric: {
        include: { criteria: true },
      },
      submissions: {
        include: {
          mahasiswa: { select: { id: true, name: true, email: true } },
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
  const isEnrolled = assignment.class.enrollments.some((e) => e.mahasiswaId === session.user.id);

  if (!isDosen && !isEnrolled) {
    redirect("/classes");
  }

  const due = new Date(assignment.dueDate);
  const isPastDue = due.getTime() < Date.now();

  const studentSubmission = !isDosen
    ? assignment.submissions.find((s) => s.mahasiswaId === session.user.id)
    : null;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/classes/${classId}`} className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Kelas {assignment.class.name}</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              Format: {assignment.submissionType}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              Skor Maks: {assignment.maxScore} Poin
            </Badge>
            {assignment.rubric && (
              <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Rubrik AI: {assignment.rubric.title}
              </Badge>
            )}
            {isPastDue && (
              <Badge variant="destructive" className="text-xs">
                Tenggat Berakhir
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">
            {assignment.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className={`flex items-center gap-1.5 ${isPastDue ? "text-destructive font-semibold" : ""}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Tenggat: {formatDateTime(due)} ({formatRelativeTime(due)})</span>
            </div>
            <span>•</span>
            <span>Pengajar: {assignment.class.dosen.name}</span>
          </div>
        </div>

        {isDosen && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/classes/${classId}/rubrics`}>
                <Layers className="w-4 h-4 mr-1.5" />
                Kelola Rubrik
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Grid: Instructions & Rubrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Instructions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Instruksi Penugasan
            </h2>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          </div>

          {/* Student Graded Result Card (if graded) */}
          {!isDosen && studentSubmission?.grade && (
            <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg font-display">
                  <Award className="w-6 h-6" />
                  <span>Nilai & Evaluasi Akhir</span>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-base px-3 py-1">
                  {studentSubmission.grade.finalScore} / {assignment.maxScore}
                </Badge>
              </div>

              <div className="p-4 rounded-xl bg-background border border-border/80 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Umpan Balik Dosen Pengajar:
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {studentSubmission.grade.finalFeedback}
                </p>
              </div>

              <div className="text-xs text-muted-foreground flex items-center justify-between pt-1">
                <span>Dinilai pada {formatDateTime(studentSubmission.grade.gradedAt)}</span>
                {studentSubmission.grade.isAIAssisted && (
                  <span className="text-[11px] text-accent flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3" />
                    Dibantu Asisten AI (Keputusan Final Dosen)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Student Submission Uploader or Status (if not graded) */}
          {!isDosen && !studentSubmission?.grade && (
            <SubmissionUploader
              classId={classId}
              assignmentId={assignmentId}
              allowedType={assignment.submissionType}
              existingSubmission={studentSubmission}
            />
          )}

          {/* DOSEN VIEW: Submissions Table */}
          {isDosen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Daftar Pengumpulan Mahasiswa ({assignment.submissions.length} / {assignment.class.enrollments.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Gunakan asisten AI untuk menganalisis jawaban dan berikan nilai final dengan kontrol penuh dosen.
                  </p>
                </div>
              </div>

              {assignment.submissions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40">
                  <p className="text-sm text-muted-foreground">
                    Belum ada mahasiswa yang mengumpulkan tugas ini.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border/60">
                  {assignment.submissions.map((sub) => {
                    const isLate = new Date(sub.submittedAt).getTime() > due.getTime();

                    return (
                      <div
                        key={sub.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">
                            {getInitials(sub.mahasiswa.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">
                                {sub.mahasiswa.name}
                              </span>
                              {isLate && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                  Terlambat
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                                {sub.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {sub.fileName || "Esai teks langsung"} • Dikumpulkan {formatRelativeTime(sub.submittedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:self-center">
                          {/* Status Badge */}
                          {sub.status === "GRADED" ? (
                            <Badge className="bg-emerald-600 text-white font-mono text-xs gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Nilai: {sub.grade?.finalScore}
                            </Badge>
                          ) : sub.status === "AI_REVIEWED" ? (
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-xs gap-1 dark:text-violet-400">
                              <Sparkles className="w-3.5 h-3.5" />
                              Saran AI: {sub.aiEvaluation?.suggestedTotalScore ?? "-"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                              Menunggu Koreksi
                            </Badge>
                          )}

                          {/* Action Button */}
                          <Button size="sm" asChild className="gap-1.5 h-8 text-xs font-semibold">
                            <Link href={`/classes/${classId}/assignments/${assignmentId}/submissions/${sub.id}`}>
                              {sub.status === "GRADED" ? "Lihat / Edit Nilai" : "Koreksi dengan AI"}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Rubric Criteria Sidebar */}
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="font-bold font-display text-base text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Rubrik Penilaian
              </h3>
              {assignment.rubric && (
                <Badge variant="outline" className="text-[11px] bg-accent/5 text-accent border-accent/20">
                  {assignment.rubric.criteria.length} Kriteria
                </Badge>
              )}
            </div>

            {assignment.rubric ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  {assignment.rubric.title}
                </p>
                <div className="space-y-2.5">
                  {assignment.rubric.criteria.map((crit, idx) => (
                    <div
                      key={crit.id}
                      className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {idx + 1}. {crit.label}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {crit.weight}%
                        </span>
                      </div>
                      {crit.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {crit.description}
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Skor Maks: {crit.maxScore}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Tugas ini tidak menggunakan rubrik kriteria khusus. AI akan mengevaluasi berdasarkan keakuratan terhadap instruksi tugas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
