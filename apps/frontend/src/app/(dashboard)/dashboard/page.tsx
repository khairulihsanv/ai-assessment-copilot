import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JadwalKuliahButton } from "@/components/features/dashboard-quick-actions";
import { DosenDashboard } from "@/components/features/dosen-dashboard";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
import { formatRelativeTime } from "@/shared/utils";

export const metadata = { title: "Ringkasan — Dexa Assessment" };
const panel = "overflow-hidden rounded-lg border border-border bg-card";
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="min-w-0 py-4 px-2 sm:px-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data, ok } = await fetchFromBackend<{
    role: "DOSEN" | "MAHASISWA";
    dosenData?: {
      classes: Array<{
        id: string;
        name: string;
        subject: string | null;
        createdAt: string | Date;
        _count: { enrollments: number; assignments: number };
      }>;
      pending: number;
      released: number;
      queue: Array<{
        id: string;
        createdAt: string | Date;
        user: { name: string };
        assignment: { id: string; title: string; classId: string; class: { name: string } };
      }>;
    };
    studentData?: {
      enrollments: Array<{ id: string; class: { id: string; name: string } }>;
      tasks: Array<{
        id: string;
        title: string;
        dueDate: string | Date;
        classId: string;
        class: { name: string };
        submissions: Array<{ id: string }>;
      }>;
      grades: Array<{
        id: string;
        finalScore: number;
        status: string;
        createdAt: string | Date;
        submission: {
          releasedGradeId: string | null;
          assignment: { id: string; classId: string; title: string; maxScore: number };
        };
      }>;
    };
  }>("/dashboard");

  const isDosen = session.user.role === "DOSEN";
  return isDosen ? (
    <DosenDashboard
      name={session.user.name || "Dosen"}
      unavailable={!ok || !data?.dosenData}
      dateLabel={new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date())}
      data={data?.dosenData ?? { classes: [], pending: 0, released: 0, queue: [] }}
    />
  ) : (
    <StudentDashboard
      name={session.user.name || "Mahasiswa"}
      data={data?.studentData ?? { enrollments: [], tasks: [], grades: [] }}
    />
  );
}
async function StudentDashboard({
  name,
  data,
}: {
  name: string;
  data: {
    enrollments: Array<{ id: string; class: { id: string; name: string } }>;
    tasks: Array<{
      id: string;
      title: string;
      dueDate: string | Date;
      classId: string;
      class: { name: string };
      submissions: Array<{ id: string }>;
    }>;
    grades: Array<{
      id: string;
      finalScore: number;
      status: string;
      createdAt: string | Date;
      submission: {
        releasedGradeId: string | null;
        assignment: { id: string; classId: string; title: string; maxScore: number };
      };
    }>;
  };
}) {
  const { enrollments, tasks, grades: currentGrades } = data;
  return (
    <div className="space-y-7">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          Ruang belajar
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Halo, {name}.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lanjutkan tugas dan baca umpan balik dari dosen Anda.
        </p>
        <div className="mt-4">
          <JadwalKuliahButton />
        </div>
      </header>
      <section className="grid grid-cols-3 divide-x divide-border border-y border-border">
        <Metric label="Kelas diikuti" value={enrollments.length} note="Keanggotaan Anda" />
        <Metric label="Tugas ditampilkan" value={tasks.length} note="Maksimal 6 tenggat terdekat" />
        <Metric label="Nilai dirilis" value={currentGrades.length} note="Keputusan dosen" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className={panel}>
          <h2 className="border-b border-border p-5 text-lg font-semibold">
            Tugas yang perlu diperhatikan
          </h2>
          {tasks.length ? (
            tasks.map((t) => (
              <Link
                key={t.id}
                href={`/classes/${t.classId}/assignments/${t.id}`}
                className="flex items-center gap-4 border-b border-border p-5 last:border-0 hover:bg-muted/50"
              >
                <Clock size={18} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t.class.name}</p>
                  <h3 className="mt-1 text-sm font-semibold">{t.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.submissions.length ? "Sudah dikumpulkan" : "Belum dikumpulkan"} ·{" "}
                    {formatRelativeTime(t.dueDate)}
                  </p>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))
          ) : (
            <Empty>Belum ada tugas terbit dari kelas Anda.</Empty>
          )}
        </section>
        <section className={panel}>
          <h2 className="border-b border-border p-5 text-lg font-semibold">Hasil terbaru</h2>
          {currentGrades.length ? (
            currentGrades.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                href={`/classes/${g.submission.assignment.classId}/assignments/${g.submission.assignment.id}/result`}
                className="flex items-center gap-3 border-b border-border p-5 last:border-0 hover:bg-muted/50"
              >
                <CheckCircle2 size={18} className="shrink-0 text-primary" />
                <span className="flex-1 text-sm font-medium">{g.submission.assignment.title}</span>
                <span className="text-lg font-semibold tabular-nums">
                  {g.finalScore}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{g.submission.assignment.maxScore}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <Empty>Nilai dan umpan balik akan tampil setelah dirilis dosen.</Empty>
          )}
        </section>
      </div>
    </div>
  );
}
