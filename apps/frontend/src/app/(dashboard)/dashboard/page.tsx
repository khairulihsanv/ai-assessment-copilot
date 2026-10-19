import { ArrowRight, CheckCircle2, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClassCard } from "@/components/features/class-card";
import { DosenQuickActionGroup } from "@/components/features/dashboard-quick-actions";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
import { formatRelativeTime } from "@/shared/utils";

export const metadata = { title: "Ringkasan — Dexa Assessment" };
const action =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90";
const panel = "workspace-panel";
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="workspace-metric min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data } = await fetchFromBackend<{
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
      data={data?.dosenData ?? { classes: [], pending: 0, released: 0, queue: [] }}
    />
  ) : (
    <StudentDashboard
      name={session.user.name || "Mahasiswa"}
      data={data?.studentData ?? { enrollments: [], tasks: [], grades: [] }}
    />
  );
}
async function DosenDashboard({
  name,
  data,
}: {
  name: string;
  data: {
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
}) {
  const { classes, pending, released, queue } = data;
  return (
    <div className="space-y-7 pb-10">
      <header className="workspace-hero flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="workspace-eyebrow">Ruang kerja dosen</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Selamat mengajar, {name.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Satu ruang untuk kelas Anda. Mulai dari yang perlu diperhatikan hari ini.
          </p>
        </div>
        <Link
          className={action}
          href={classes[0] ? `/classes/${classes[0].id}/assignments/new` : "/classes"}
        >
          <Plus size={16} />
          Buat tugas
        </Link>
      </header>
      <section aria-label="Ringkasan pekerjaan" className="workspace-metrics">
        <Metric label="Perlu dikoreksi" value={pending} note="Belum memiliki nilai rilis" />
        <Metric label="Nilai dirilis" value={released} note="Sudah tersedia bagi mahasiswa" />
        <Metric
          label="Kelas aktif"
          value={classes.length}
          note={`${classes.reduce((n, c) => n + c._count.enrollments, 0)} keanggotaan mahasiswa`}
        />
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className={panel}>
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-semibold">Antrean koreksi</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pengumpulan terbaru yang menunggu keputusan Anda.
              </p>
            </div>
            <Link href="/grading" className="text-sm font-medium text-primary">
              Lihat semua →
            </Link>
          </div>
          {queue.length ? (
            <div className="divide-y divide-border">
              {queue.map((s) => (
                <Link
                  key={s.id}
                  href={`/classes/${s.assignment.classId}/assignments/${s.assignment.id}/submissions/${s.id}`}
                  className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold">
                    {s.user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{s.user.name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {s.assignment.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.assignment.class.name} · {formatRelativeTime(s.createdAt)}
                    </p>
                  </div>
                  <span className="hidden text-xs font-medium text-primary sm:block">
                    Tinjau jawaban
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-primary" />
                </Link>
              ))}
            </div>
          ) : (
            <Empty>
              Antrean Anda kosong. Jawaban yang dikumpulkan mahasiswa akan muncul di sini.
            </Empty>
          )}
        </section>
        <aside className="space-y-6">
          <section className="workspace-workflow">
            <p className="workspace-eyebrow">Asisten penilaian</p>
            <h2>Dari jawaban ke umpan balik.</h2>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Susun rubrik</strong>
                  <p>Tentukan kriteria dan bobot penilaian.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Tinjau saran AI</strong>
                  <p>Periksa skor bersama bukti jawaban.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Anda yang memutuskan</strong>
                  <p>Sesuaikan, lalu rilis nilai ke mahasiswa.</p>
                </div>
              </li>
            </ol>
          </section>
          <section className={panel}>
            <h2 className="border-b border-border p-4 text-sm font-semibold">Akses cepat</h2>
            <div className="p-3">
              <DosenQuickActionGroup />
            </div>
          </section>
        </aside>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kelas yang Anda ampu</h2>
          <Link href="/classes" className="text-sm font-medium text-primary">
            Kelola kelas →
          </Link>
        </div>
        {classes.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.slice(0, 3).map((c) => (
              <ClassCard
                key={c.id}
                id={c.id}
                name={c.name}
                subject={c.subject}
                studentCount={c._count.enrollments}
                isDosen
              />
            ))}
          </div>
        ) : (
          <div className={panel}>
            <Empty>
              Mulai ruang mengajar Anda dengan membuat kelas pertama.{" "}
              <Link href="/classes" className="font-semibold text-primary underline">
                Buat kelas →
              </Link>
            </Empty>
          </div>
        )}
      </section>
    </div>
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
      <header className="workspace-hero">
        <p className="workspace-eyebrow">Ruang belajar</p>
        <h1 className="text-3xl font-semibold tracking-tight">Halo, {name}.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lanjutkan tugas dan baca umpan balik dari dosen Anda.
        </p>
      </header>
      <section className="workspace-metrics">
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
