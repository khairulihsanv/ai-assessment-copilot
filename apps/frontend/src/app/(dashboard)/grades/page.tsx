import { Award } from "lucide-react";
import { redirect } from "next/navigation";
import { ExportTranscriptButton } from "@/components/features/dashboard-quick-actions";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
import { formatDate } from "@/shared/utils";

export const metadata = {
  title: "Riwayat Nilai & Transkrip — AI Assessment Copilot",
};

interface ReleasedGrade {
  id: string;
  submission: {
    assignment: { title: string; class: { id: string; name: string }; maxScore: number };
  };
  gradedBy: { name: string | null };
  createdAt: string;
  finalScore: number;
}

export default async function GradesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { ok, data } = await fetchFromBackend<ReleasedGrade[]>("/grades");
  const grades = data || [];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              Nilai tugas
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mt-1.5 flex items-center gap-2.5">
            <Award className="text-primary" size={28} />
            <span>Riwayat Nilai & Capaian Akademik</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Daftar perolehan skor tugas yang telah disahkan oleh dosen pengampu mata kuliah.
          </p>
        </div>

        <ExportTranscriptButton />
      </div>

      {ok && data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section
            aria-label="Nilai dirilis"
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-sm font-medium text-muted-foreground">Nilai dirilis</h2>
            <p
              className="mt-4 text-4xl font-semibold tabular-nums text-foreground"
              data-metric-value
            >
              {grades.length}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tugas dengan nilai yang sudah dipublikasikan dosen
            </p>
          </section>
          <section
            aria-label="Kelas dengan nilai"
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="text-sm font-medium text-muted-foreground">Kelas dengan nilai</h2>
            <p
              className="mt-4 text-4xl font-semibold tabular-nums text-foreground"
              data-metric-value
            >
              {new Set(grades.map((g) => g.submission.assignment.class.id)).size}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Kelas yang memiliki nilai tugas dirilis
            </p>
          </section>
        </div>
      ) : (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-card p-6 text-sm">
          Riwayat nilai belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.
        </p>
      )}

      {/* Grades List Table Card */}
      <div className="bg-card rounded-xl border border-border shadow-none p-7 space-y-5">
        <h2 className="font-display text-base font-semibold text-foreground">
          Rincian Nilai Tugas
        </h2>

        {!ok ? (
          <p className="text-sm text-muted-foreground">
            Rincian akan tampil setelah riwayat nilai berhasil dimuat.
          </p>
        ) : grades.length > 0 ? (
          <div className="divide-y divide-border">
            {grades.map((g) => (
              <div
                key={g.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-muted/50 -mx-3 px-3 rounded-lg"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-sm text-foreground">
                      {g.submission.assignment.title}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {g.submission.assignment.class.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Disahkan oleh{" "}
                    <span className="font-bold text-foreground">{g.gradedBy.name}</span> •{" "}
                    {formatDate(g.createdAt)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="inline-flex items-baseline gap-1 bg-secondary px-3.5 py-1.5 rounded-full border border-border">
                    <span className="font-display text-lg font-semibold text-primary">
                      {g.finalScore}
                    </span>
                    <span className="text-xs font-semibold text-primary/80">
                      / {g.submission.assignment.maxScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-14 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg border border-dashed border-border">
            Belum ada nilai resmi yang disahkan oleh dosen pengampu.
          </div>
        )}
      </div>
    </div>
  );
}
