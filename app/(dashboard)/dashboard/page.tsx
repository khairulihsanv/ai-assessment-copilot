import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { BookOpen, Users, Sparkles, Clock, FileText, TrendingUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isDosen = session.user.role === "DOSEN";

  if (isDosen) {
    return <DosenDashboard userId={session.user.id} userName={session.user.name || "Dosen"} />;
  }
  return <MahasiswaDashboard userId={session.user.id} userName={session.user.name || "Mahasiswa"} />;
}

async function DosenDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [classes, pendingSubmissions, recentGrades] = await Promise.all([
    prisma.class.findMany({
      where: { dosenId: userId, isArchived: false },
      include: { _count: { select: { enrollments: true, assignments: true } } },
    }),
    prisma.submission.count({
      where: {
        assignment: { class: { dosenId: userId } },
        status: { in: ["SUBMITTED", "AI_REVIEWED"] },
      },
    }),
    prisma.grade.findMany({
      where: { gradedBy: { id: userId } },
      orderBy: { gradedAt: "desc" },
      take: 5,
      include: {
        submission: {
          include: {
            mahasiswa: { select: { name: true } },
            assignment: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const totalStudents = classes.reduce((sum, c) => sum + c._count.enrollments, 0);

  const stats = [
    { label: "Kelas Aktif", value: classes.length, icon: BookOpen, color: "var(--color-primary-500)" },
    { label: "Total Mahasiswa", value: totalStudents, icon: Users, color: "var(--color-final-500)" },
    { label: "Menunggu Review", value: pendingSubmissions, icon: Sparkles, color: "var(--color-ai-500)" },
    { label: "Tugas Dinilai", value: recentGrades.length, icon: TrendingUp, color: "var(--color-success-500)" },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-[fade-in_0.3s_ease-out]">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Selamat Datang, {userName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Berikut ringkasan kelas dan penilaian Anda
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-5 rounded-xl border transition-all duration-200 hover:shadow-md"
            style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in oklch, ${stat.color} 15%, transparent)` }}
              >
                <stat.icon size={16} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Classes */}
        <div className="rounded-xl border p-5" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Kelas Aktif
            </h2>
            <Link href="/classes" className="text-xs font-medium hover:underline" style={{ color: "var(--color-primary-500)" }}>
              Lihat Semua →
            </Link>
          </div>
          {classes.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              Belum ada kelas. Buat kelas pertama Anda!
            </p>
          ) : (
            <div className="space-y-3">
              {classes.slice(0, 4).map((cls) => (
                <Link
                  key={cls.id}
                  href={`/classes/${cls.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cls.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{cls.subject ?? "Tanpa mata kuliah"}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{cls._count.enrollments} siswa</span>
                    <span>{cls._count.assignments} tugas</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Reviews */}
        <div className="rounded-xl border p-5" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
          <h2 className="font-display text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Penilaian Terbaru
          </h2>
          {recentGrades.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              Belum ada penilaian
            </p>
          ) : (
            <div className="space-y-3">
              {recentGrades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {grade.submission.mahasiswa.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {grade.submission.assignment.title}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono" style={{ color: "var(--color-final-500)" }}>
                      {grade.finalScore}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatRelativeTime(grade.gradedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function MahasiswaDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [enrollments, upcomingAssignments, recentGrades] = await Promise.all([
    prisma.enrollment.findMany({
      where: { mahasiswaId: userId },
      include: { class: { select: { id: true, name: true, subject: true } } },
    }),
    prisma.assignment.findMany({
      where: {
        class: { enrollments: { some: { mahasiswaId: userId } } },
        status: "PUBLISHED",
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        class: { select: { name: true } },
        submissions: { where: { mahasiswaId: userId }, select: { id: true, status: true } },
      },
    }),
    prisma.grade.findMany({
      where: { submission: { mahasiswaId: userId } },
      orderBy: { gradedAt: "desc" },
      take: 5,
      include: {
        submission: {
          include: { assignment: { select: { title: true, maxScore: true, class: { select: { name: true } } } } },
        },
      },
    }),
  ]);

  const stats = [
    { label: "Kelas Diikuti", value: enrollments.length, icon: BookOpen, color: "var(--color-primary-500)" },
    { label: "Tugas Mendatang", value: upcomingAssignments.length, icon: Clock, color: "var(--color-warning-500)" },
    { label: "Nilai Masuk", value: recentGrades.length, icon: FileText, color: "var(--color-final-500)" },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-[fade-in_0.3s_ease-out]">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Selamat Datang, {userName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Berikut ringkasan tugas dan nilai Anda
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl border" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `color-mix(in oklch, ${stat.color} 15%, transparent)` }}
            >
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming assignments */}
        <div className="rounded-xl border p-5" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
          <h2 className="font-display text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Tugas Mendatang
          </h2>
          {upcomingAssignments.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              Tidak ada tugas mendatang 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((asmt) => {
                const submitted = asmt.submissions.length > 0;
                return (
                  <Link
                    key={asmt.id}
                    href={`/classes/${asmt.classId}/assignments/${asmt.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{asmt.title}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{asmt.class.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium" style={{ color: submitted ? "var(--color-success-500)" : "var(--color-warning-500)" }}>
                        {submitted ? "✓ Sudah submit" : "⏳ Belum submit"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {formatRelativeTime(asmt.dueDate)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Grades */}
        <div className="rounded-xl border p-5" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
          <h2 className="font-display text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Nilai Terbaru
          </h2>
          {recentGrades.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              Belum ada nilai
            </p>
          ) : (
            <div className="space-y-3">
              {recentGrades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {grade.submission.assignment.title}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {grade.submission.assignment.class.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono" style={{ color: "var(--color-final-500)" }}>
                      {grade.finalScore}/{grade.submission.assignment.maxScore}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatRelativeTime(grade.gradedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
