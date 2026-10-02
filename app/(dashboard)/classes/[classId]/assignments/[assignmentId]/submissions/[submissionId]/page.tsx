import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ChevronLeft, Sparkles, Award } from "lucide-react";
import { AIReviewPanel } from "@/components/features/ai-review-panel";
import { extractTextFromFile } from "@/lib/ai/extract-text";

interface SubmissionReviewPageProps {
  params: Promise<{
    classId: string;
    assignmentId: string;
    submissionId: string;
  }>;
}

export const metadata = {
  title: "Studio Penilaian AI & Validasi Dosen — AI Assessment Copilot • SV UNS",
};

export default async function SubmissionReviewPage({ params }: SubmissionReviewPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId, assignmentId, submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      assignment: {
        include: {
          class: true,
          rubric: {
            include: { criteria: true },
          },
        },
      },
      evaluations: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
      grades: true,
      versions: true,
    },
  });

  if (!submission || submission.assignmentId !== assignmentId || submission.assignment.classId !== classId) {
    notFound();
  }

  // Dosen verification
  if (submission.assignment.class.dosenId !== session.user.id) {
    redirect(`/classes/${classId}/assignments/${assignmentId}`);
  }

  const activeVersion = submission.versions.find(v => v.id === submission.activeVersionId);
  if (!activeVersion) notFound();
  const initialAIEvaluation = submission.evaluations.find(e => e.versionId === activeVersion?.id);
  const initialGrade = submission.grades.find(g => g.id === submission.releasedGradeId && g.versionId === activeVersion.id && g.status === "RELEASED");

  // Prepare text content if file
  let displayContent = activeVersion?.content || "";
  if (!displayContent && activeVersion?.fileUrl && (activeVersion.type === "PDF" || activeVersion.type === "DOCX")) {
    try {
      displayContent = await extractTextFromFile(activeVersion.fileUrl, activeVersion.type);
    } catch {
      // ignore extract error on page load, will be handled during grading
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/classes/${classId}/assignments/${assignmentId}`}
          className="hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Penugasan: {submission.assignment.title}</span>
        </Link>
      </div>

      <div className="border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Koreksi Jawaban: {submission.user.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tugas: {submission.assignment.title} • Skor Maksimal: {submission.assignment.maxScore}
            </p>
          </div>
        </div>
      </div>

      <AIReviewPanel
        key={activeVersion.id}
        submissionId={submission.id}
        submissionVersionId={activeVersion.id}
        releasedGradeId={submission.releasedGradeId}
        classId={classId}
        assignmentId={assignmentId}
        assignmentTitle={submission.assignment.title}
        maxScore={submission.assignment.maxScore}
        studentName={submission.user.name}
        submissionType={activeVersion?.type || "ANY"}
        submissionContent={displayContent}
        fileName={activeVersion?.fileName || ""}
        fileUrl={activeVersion?.fileUrl || ""}
        rubricCriteria={submission.assignment.rubric?.criteria}
        initialAIEvaluation={initialAIEvaluation || null}
        initialGrade={initialGrade || null}
      />
    </div>
  );
}
