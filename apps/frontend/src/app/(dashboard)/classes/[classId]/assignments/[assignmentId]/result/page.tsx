import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
import { formatDateTime } from "@/shared/utils";

interface ResultPageProps {
  params: Promise<{ classId: string; assignmentId: string }>;
}

interface PublicCriterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore: number;
  weight: number;
}

interface FinalCriterion {
  criterionId: string;
  finalScore: number | null;
  finalFeedback?: string | null;
}

export const metadata = { title: "Hasil penilaian" };

function formatScore(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export default async function AssignmentResultPage({ params }: ResultPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { classId, assignmentId } = await params;
  const res = await fetchFromBackend(`/classes/${classId}/assignments/${assignmentId}/result`, {
    userId: session.user.id,
    role: session.user.role,
  });
  if (res.status === 403) notFound();
  if (!res.ok) redirect(`/classes/${classId}/assignments/${assignmentId}`);

  const { submission, grade } = await res.json();
  if (!submission || !grade) redirect(`/classes/${classId}/assignments/${assignmentId}`);

  const assignment = submission.assignment;
  const rubricCriteria: PublicCriterion[] = assignment.rubric?.criteria ?? [];
  const finalById = new Map<string, FinalCriterion>(
    ((grade.criteria ?? []) as FinalCriterion[]).map((c) => [c.criterionId, c]),
  );
  const rows = rubricCriteria
    .map((c) => ({ criterion: c, final: finalById.get(c.id) }))
    .filter((r) => r.final && r.final.finalScore !== null && r.final.finalScore !== undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/classes/${classId}/assignments/${assignmentId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke tugas
      </Link>

      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {assignment.class.name} · {assignment.class.dosen.name}
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
          {assignment.title}
        </h1>
      </header>

      <section aria-labelledby="final-heading" className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="final-heading" className="text-sm font-medium text-muted-foreground">
              Nilai & Evaluasi Akhir
            </h2>
            <p className="tabular mt-1 text-4xl font-semibold text-foreground">
              {formatScore(grade.finalScore)}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}
                / {assignment.maxScore}
              </span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Dirilis {formatDateTime(grade.createdAt)}</p>
        </div>

        {rows.length > 0 && (
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold">Rincian per kriteria</h3>
            <ul className="mt-3 divide-y divide-border">
              {rows.map(({ criterion, final }) => {
                const score = final?.finalScore ?? 0;
                const pct =
                  criterion.maxScore > 0 ? Math.min(100, (score / criterion.maxScore) * 100) : 0;
                return (
                  <li key={criterion.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{criterion.label}</span>
                      <span className="tabular shrink-0 text-sm">
                        <span className="font-semibold">{formatScore(score)}</span>
                        <span className="text-muted-foreground"> / {criterion.maxScore}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted" aria-hidden="true">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    {final?.finalFeedback && (
                      <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                        {final.finalFeedback}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">Bobot {criterion.weight}%</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="p-5">
          <h3 className="text-sm font-semibold">Umpan balik dosen</h3>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{grade.finalFeedback}</p>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Nilai ini ditetapkan dan dirilis oleh dosen pengampu
        {grade.isAIAssisted ? ", dengan bantuan draf AI yang sudah ditinjau." : "."}
      </p>
    </div>
  );
}
