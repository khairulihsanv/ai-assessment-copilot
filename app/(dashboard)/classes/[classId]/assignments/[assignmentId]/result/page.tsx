import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ChevronLeft, Award, CheckCircle2, FileText, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

interface ResultPageProps {
  params: Promise<{
    classId: string;
    assignmentId: string;
  }>;
}

export const metadata = {
  title: "Hasil Penilaian Tugas — AI Assessment Copilot • SV UNS",
};

export default async function AssignmentResultPage({ params }: ResultPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId, assignmentId } = await params;

  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_mahasiswaId: {
        assignmentId,
        mahasiswaId: session.user.id,
      },
    },
    include: {
      grade: true,
      assignment: {
        include: {
          class: {
            include: {
              dosen: { select: { name: true } },
            },
          },
          rubric: {
            include: { criteria: true },
          },
        },
      },
    },
  });

  if (!submission || !submission.grade) {
    redirect(`/classes/${classId}/assignments/${assignmentId}`);
  }

  const { grade, assignment } = submission;
  const percentage = Math.round((grade.finalScore / assignment.maxScore) * 100);

  const getLetterBadge = (pct: number) => {
    if (pct >= 85) return { grade: "A", color: "bg-emerald-600 text-white" };
    if (pct >= 75) return { grade: "B+", color: "bg-blue-600 text-white" };
    if (pct >= 65) return { grade: "B", color: "bg-blue-500 text-white" };
    if (pct >= 55) return { grade: "C", color: "bg-amber-500 text-white" };
    return { grade: "D", color: "bg-rose-600 text-white" };
  };

  const letterInfo = getLetterBadge(percentage);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/classes/${classId}/assignments/${assignmentId}`}
          className="hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Detail Penugasan</span>
        </Link>
      </div>

      {/* Main Grade Header Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-card via-card to-emerald-500/5 border-2 border-emerald-500/30 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div className="space-y-1">
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
              Hasil Evaluasi Resmi
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground">
              {assignment.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Mata Kuliah: {assignment.class.name} • Penguji: {assignment.class.dosen.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-medium">Nilai Akhir</span>
              <div className="text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {grade.finalScore}
                <span className="text-lg text-muted-foreground font-normal"> / {assignment.maxScore}</span>
              </div>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl font-mono shadow-sm ${letterInfo.color}`}>
              {letterInfo.grade}
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="p-5 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Catatan & Umpan Balik Dosen Pengampu:
          </h3>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
            {grade.finalFeedback}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Dinilai secara resmi pada {formatDateTime(grade.gradedAt)}</span>
          {grade.isAIAssisted && (
            <span className="text-[11px] text-accent flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Dibantu AI Copilot (Disahkan Dosen)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
