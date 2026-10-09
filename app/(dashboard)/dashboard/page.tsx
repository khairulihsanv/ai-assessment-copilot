import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import {
  DosenQuickActionGroup,
  SyncSiakadButton,
  JadwalKuliahButton,
} from "@/components/features/dashboard-quick-actions";

export const metadata = { title: "Ringkasan — Dexa Assessment" };
const action =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90";
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
  const userId = session.user.id;
  const isDosen = session.user.role === "DOSEN";
  return isDosen ? (
    <DosenDashboard userId={userId} name={session.user.name || "Dosen"} />
  ) : (
    <StudentDashboard userId={userId} name={session.user.name || "Mahasiswa"} />
  );
}
async function DosenDashboard({ userId, name }: { userId: string; name: string }) {
  const [classes, pending, released, queue] = await Promise.all([
    prisma.class.findMany({
      where: { dosenId: userId, isArchived: false },
      include: { _count: { select: { enrollments: true, assignments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.count({
      where: {
        assignment: { class: { dosenId: userId } },
        activeVersionId: { not: null },
        releasedGradeId: null,
      },
    }),
    prisma.submission.count({
      where: {
        assignment: { class: { dosenId: userId } },
        releasedGradeId: { not: null },
      },
    }),
    prisma.submission.findMany({
      where: {
        assignment: { class: { dosenId: userId } },
        activeVersionId: { not: null },
        releasedGradeId: null,
      },
      include: {
        user: { select: { name: true } },
        assignment: {
          select: {
            id: true,
            title: true,
            classId: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  return (
    <div className="space-y-7 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Ruang kerja dosen
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Selamat datang, {name}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tinjau jawaban, berikan umpan balik, lalu rilis nilai.
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
      <section
        aria-label="Ringkasan pekerjaan"
        className="grid grid-cols-3 divide-x divide-border border-y border-border"
      >
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
          <section className="border-l-2 border-primary py-1 pl-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Keputusan tetap di tangan Anda
            </p>
            <h2 className="mt-3 text-lg font-semibold">
              AI memberi saran.
              <br />
              Dosen menentukan nilai.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Periksa jawaban dan acuan sebelum menyetujui skor. Mahasiswa hanya melihat hasil yang
              Anda rilis.
            </p>
          </section>
          <section className={panel}>
            <h2 className="border-b border-border p-4 text-sm font-semibold">Akses cepat</h2>
            <div className="p-3">
              <DosenQuickActionGroup />
            </div>
          </section>
          <JadwalKuliahButton />
          <SyncSiakadButton />
        </aside>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kelas yang Anda ampu</h2>
          <Link href="/classes" className="text-sm font-medium text-primary">
            Kelola kelas →
          </Link>
        </div>
        <div className={panel}>
          {classes.length ? (
            <div className="divide-y divide-border">
              {classes.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/classes/${c.id}`}
                  className="flex items-center gap-4 p-5 hover:bg-muted/50"
                >
                  <BookOpen size={20} className="text-primary" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.subject || "Mata kuliah"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c._count.assignments} tugas · {c._count.enrollments} mahasiswa
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Belum ada kelas aktif. Buat kelas pertama melalui menu Kelas.</Empty>
          )}
        </div>
      </section>
    </div>
  );
}
async function StudentDashboard({ userId, name }: { userId: string; name: string }) {
  const [enrollments, tasks, grades] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: { class: { select: { id: true, name: true } } },
    }),
    prisma.assignment.findMany({
      where: {
        class: { enrollments: { some: { userId } } },
        status: "PUBLISHED",
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: {
        class: { select: { name: true } },
        submissions: { where: { userId }, select: { id: true } },
      },
    }),
    prisma.gradeRevision.findMany({
      where: { submission: { userId }, status: "RELEASED" },
      include: {
        submission: {
          select: {
            releasedGradeId: true,
            assignment: {
              select: { id: true, classId: true, title: true, maxScore: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const currentGrades = grades.filter((g) => g.id === g.submission.releasedGradeId);
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
