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

export const metadata = { title: "Studio penilaian | Dexa Assessment" };

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
      grades: { where: { status: "RELEASED" } },
      evaluations: true,
      versions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = submissions.map((s) => ({
    ...s,
    released: s.grades.find((g) => g.id === s.releasedGradeId),
    hasDraft: s.evaluations.some((e) => e.versionId === s.activeVersionId),
  }));
  const pending = rows.filter((s) => !s.released);
  return (
    <div className="space-y-7 pb-10">
      <header className="border-b border-border pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          Koreksi & umpan balik
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Studio penilaian</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Periksa jawaban dan saran AI. Rilis nilai setelah Anda yakin.
        </p>
      </header>
      <div className="flex flex-wrap gap-6 text-sm">
        <span>
          <strong className="mr-2 text-2xl tabular-nums">{pending.length}</strong>
          menunggu keputusan
        </span>
        <span className="text-muted-foreground">
          <strong className="mr-2 text-2xl tabular-nums">{rows.length - pending.length}</strong>
          nilai dirilis
        </span>
      </div>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4 text-sm font-semibold">
          Semua pengumpulan
        </div>
        {rows.length ? (
          <div className="divide-y divide-border">
            {[...pending, ...rows.filter((s) => s.released)].map((s) => (
              <Link
                key={s.id}
                href={`/classes/${s.assignment.classId}/assignments/${s.assignment.id}/submissions/${s.id}`}
                className="grid gap-3 p-5 transition-colors hover:bg-muted/50 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{s.user.name}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{s.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{s.assignment.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.assignment.class.name} · {formatRelativeTime(s.createdAt)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${s.released ? "border-primary/20 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {s.released
                      ? `Dirilis · ${s.released.finalScore}/${s.assignment.maxScore}`
                      : s.hasDraft
                        ? "Saran AI tersedia"
                        : "Belum dikoreksi"}
                  </span>
                  <ArrowRight size={16} className="text-primary" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto mb-4 text-primary" size={28} />
            <h2 className="text-lg font-semibold">Belum ada jawaban untuk dikoreksi</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Pengumpulan mahasiswa akan muncul di sini. Siapkan tugas dan acuan penilaian terlebih
              dahulu.
            </p>
            <Link
              href="/assignments"
              className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Kelola tugas
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
