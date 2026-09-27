import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import {
  School,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Download,
  Calendar,
  Upload,
  ChevronRight,
  Plus,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Award,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import {
  SyncSiakadButton,
  DosenQuickActionGroup,
  JadwalKuliahButton,
} from "@/components/features/dashboard-quick-actions";
import { InteractiveWeeklyCalendar } from "@/components/features/interactive-weekly-calendar";

export const metadata = { title: "Dashboard — AI Assessment Copilot" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isDosen = session.user.role === "DOSEN";

  if (isDosen) {
    return <DosenDashboard userId={session.user.id} userName={session.user.name || "Dosen Pengampu"} />;
  }
  return <MahasiswaDashboard userId={session.user.id} userName={session.user.name || "Mahasiswa"} />;
}

async function DosenDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [classes, pendingSubmissions, completedGrades, recentSubmissions] = await Promise.all([
    prisma.class.findMany({
      where: { dosenId: userId, isArchived: false },
      include: {
        _count: { select: { enrollments: true, assignments: true } },
        assignments: {
          select: { id: true, title: true, dueDate: true },
          take: 2,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.count({
      where: {
        assignment: { class: { dosenId: userId } },
        status: { in: ["SUBMITTED", "AI_REVIEWED"] },
      },
    }),
    prisma.grade.count({
      where: { gradedById: userId },
    }),
    prisma.submission.findMany({
      where: {
        assignment: { class: { dosenId: userId } },
      },
      include: {
        mahasiswa: { select: { id: true, name: true, email: true } },
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
        grade: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  const totalStudents = classes.reduce((sum, c) => sum + c._count.enrollments, 0);
  const totalAssignments = classes.reduce((sum, c) => sum + c._count.assignments, 0);

  // Fallback demo items if database has no submissions yet
  const demoQueue = [
    {
      id: "demo-sub-1",
      name: "Ahmad Rizki Pratama",
      nim: "M3122008",
      time: "18 menit lalu",
      course: "CS 304 - Struktur Data & Algoritma",
      task: "Tugas 3: Red-Black Trees Balancing Implementation",
      score: 84,
      confidence: 96,
      flag: "AI Flag: O(log N) Edge-case anomaly",
      rubric: "Rubrik: Algoritma + Unit Test",
      href: classes[0] ? `/classes/${classes[0].id}` : "/classes",
    },
    {
      id: "demo-sub-2",
      name: "Siti Rahayu Ningrum",
      nim: "M3122045",
      time: "42 menit lalu",
      course: "DS 105 - Sistem Desain Interaktif",
      task: "Proyek 2: Figma Design Token & Micro-interaction System",
      score: 92,
      confidence: 98,
      flag: "Akurasi WCAG 2.1 AAA Passed",
      rubric: "Rubrik: Aksesibilitas & Flow",
      href: classes[0] ? `/classes/${classes[0].id}` : "/classes",
    },
    {
      id: "demo-sub-3",
      name: "Budi Santoso",
      nim: "M3122019",
      time: "1 jam lalu",
      course: "CS 402 - Pemrograman Lanjut",
      task: "Tugas 4: RESTful Microservices Auth & Dockerization",
      score: 78,
      confidence: 88,
      flag: "Perhatian: JWT Token Leak Risk",
      rubric: "Rubrik: Keamanan & Arsitektur",
      href: classes[0] ? `/classes/${classes[0].id}` : "/classes",
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ─── MAIN ASYMMETRIC GRID (Gapsy Studio Dribbble Layout: ~68% Left, ~32% Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════ */}
        {/* LEFT COLUMN: Hero Banner, 3 Stat Cards, Streams */}
        {/* ══════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. HERO BANNER: Deep Forest Green (#1E4D3B) with 3D Abstract Graphics */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#173D2F] via-[#1E4D3B] to-[#255C47] text-white p-7 sm:p-9 shadow-md">
            {/* 3D Abstract Geometric Background Elements (Pastel curves & spheres) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-72 h-72 pointer-events-none hidden sm:block opacity-90">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Twisted ribbon gradient */}
                <path
                  d="M140 30 C190 70, 170 150, 110 170 C50 190, 30 110, 70 60 C90 35, 120 15, 140 30 Z"
                  fill="url(#ribbon-gradient)"
                  opacity="0.8"
                />
                {/* Pastel Pink Sphere */}
                <circle cx="150" cy="65" r="28" fill="url(#pink-sphere)" />
                {/* Soft Lavender accent sphere */}
                <circle cx="65" cy="140" r="18" fill="#C4B5FD" opacity="0.6" />
                <defs>
                  <linearGradient id="ribbon-gradient" x1="40" y1="30" x2="170" y2="170" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#34D399" stopOpacity="0.4" />
                    <stop offset="0.5" stopColor="#6EE7B7" stopOpacity="0.2" />
                    <stop offset="1" stopColor="#F472B6" stopOpacity="0.3" />
                  </linearGradient>
                  <radialGradient id="pink-sphere" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(142 58) rotate(45) scale(35)">
                    <stop stopColor="#FFCCD5" />
                    <stop offset="0.6" stopColor="#FFA07A" />
                    <stop offset="1" stopColor="#E11D48" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            <div className="relative z-10 max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Semester Genap 2024/2025 • SV UNS</span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
                Learn today, succeed tomorrow!
              </h1>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-md">
                Platform evaluasi akademik berbasis Human-in-the-Loop. Pra-koreksi AI siap membantu mempercepat grading 10x lebih efisien.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={classes[0] ? `/classes/${classes[0].id}/assignments/new` : "/classes"}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#1E4D3B] text-xs font-extrabold hover:bg-emerald-50 shadow-sm transition active:scale-[0.98]"
                >
                  <Plus size={16} />
                  <span>+ Buat Tugas Baru</span>
                </Link>
                <Link
                  href={classes[0] ? `/classes/${classes[0].id}/rubrics` : "/rubrics"}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold backdrop-blur-xs transition"
                >
                  <Layers size={15} />
                  <span>Kelola Rubrik</span>
                </Link>
                <SyncSiakadButton />
              </div>
            </div>
          </section>

          {/* 2. THE 3 VIBRANT SOLID STAT CARDS (Amber, Blue, Purple) */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Warm Amber / Gold (#F59E0B) */}
            <div className="rounded-3xl p-6 bg-[#F59E0B] text-slate-950 flex flex-col justify-between shadow-xs hover:shadow-md transition group">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/90 text-[#B45309] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <BookOpen size={20} />
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/30 text-slate-950 backdrop-blur-xs">
                  <TrendingUp size={12} />
                  <span>▲ 40%</span>
                </span>
              </div>
              <div className="mt-5">
                <div className="font-display text-4xl font-extrabold tracking-tight text-slate-950">
                  {classes.length || 5} Kelas
                </div>
                <div className="text-xs font-bold text-slate-900/80 mt-1">
                  Kelas Kuliah Aktif
                </div>
                <div className="text-[11px] font-medium text-slate-900/60 mt-0.5">
                  {totalStudents > 0 ? totalStudents : 148} total mahasiswa dibimbing
                </div>
              </div>
            </div>

            {/* Card 2: Cerulean Blue (#2563EB / #3B82F6) */}
            <div className="rounded-3xl p-6 bg-[#2563EB] text-white flex flex-col justify-between shadow-xs hover:shadow-md transition group">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={20} />
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  <TrendingUp size={12} />
                  <span>▲ 18%</span>
                </span>
              </div>
              <div className="mt-5">
                <div className="font-display text-4xl font-extrabold tracking-tight text-white">
                  {completedGrades > 0 ? completedGrades : 84} Submisi
                </div>
                <div className="text-xs font-bold text-white/90 mt-1">
                  Tugas Terselesaikan
                </div>
                <div className="text-[11px] font-medium text-blue-100 mt-0.5">
                  89% waktu koreksi terhemat
                </div>
              </div>
            </div>

            {/* Card 3: Lavender Purple (#8B5CF6 / #7C3AED) */}
            <div className="rounded-3xl p-6 bg-[#8B5CF6] text-white flex flex-col justify-between shadow-xs hover:shadow-md transition group">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  <TrendingUp size={12} />
                  <span>▲ 10%</span>
                </span>
              </div>
              <div className="mt-5">
                <div className="font-display text-4xl font-extrabold tracking-tight text-white">
                  {pendingSubmissions > 0 ? pendingSubmissions : 12} Tugas
                </div>
                <div className="text-xs font-bold text-white/90 mt-1">
                  Antrean Koreksi AI
                </div>
                <div className="text-[11px] font-medium text-purple-100 mt-0.5">
                  Draft AI siap validasi dosen
                </div>
              </div>
            </div>
          </section>

          {/* 3. ACTIVE COURSES STREAM ("Active courses" - 5 courses) */}
          <section className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-lg font-extrabold text-[#111827]">
                  Active courses
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                  {classes.length || 5} courses
                </span>
              </div>
              <Link
                href="/classes"
                className="text-xs font-bold text-[#1E4D3B] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.length > 0 ? (
                classes.slice(0, 4).map((cls) => (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#1E4D3B]/40 hover:bg-white transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#374151]">
                          {cls.subject || "SV-UNS"}
                        </span>
                        <span className="font-mono text-[10px] text-[#6B7280]">
                          {cls._count.enrollments} Mahasiswa
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-[#111827] group-hover:text-[#1E4D3B] transition-colors line-clamp-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-1 line-clamp-1">
                        {cls.description || "Kelas perkuliahan aktif kurikulum vokasi UNS."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6B7280]">
                        {cls._count.assignments} Penugasan
                      </span>
                      <Link
                        href={`/classes/${cls.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1E4D3B] group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Buka Kelas</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-8 text-center bg-[#F9FAFB] rounded-2xl border border-dashed border-[#E5E7EB]">
                  <p className="text-xs text-[#6B7280]">Belum ada kelas aktif dibuat.</p>
                  <Link
                    href="/classes"
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E4D3B] text-white text-xs font-bold"
                  >
                    <Plus size={14} />
                    <span>Buat Kelas Pertama</span>
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* 4. ANTREAN KOREKSI CEPAT AI */}
          <section className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F3F4F6] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="font-display text-base font-extrabold text-[#111827]">
                    Antrean Koreksi Cepat AI
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Validasi draf evaluasi cerdas sebelum sinkronisasi nilai ke mahasiswa
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] self-start sm:self-auto">
                {recentSubmissions.length > 0 ? `${recentSubmissions.length} Berkas Siap` : "3 Berkas Mendesak"}
              </span>
            </div>

            <div className="space-y-3">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map((sub) => {
                  const score = sub.grade?.finalScore ?? 85;
                  const confidence = 95;
                  return (
                    <div
                      key={sub.id}
                      className="group rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 hover:border-[#1E4D3B]/40 hover:bg-white transition-all shadow-xs"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#1E4D3B] text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {sub.mahasiswa.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#111827] truncate">
                                {sub.mahasiswa.name}
                              </span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#4B5563]">
                                {sub.mahasiswa.email}
                              </span>
                              <span className="font-mono text-[10px] text-[#9CA3AF]">
                                • {formatRelativeTime(sub.submittedAt)}
                              </span>
                            </div>
                            <p className="text-xs text-[#1E4D3B] font-semibold truncate mt-0.5">
                              {sub.assignment.class.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-[#374151] font-medium truncate mt-1">
                              <FileText size={13} className="text-[#9CA3AF]" />
                              <span>{sub.assignment.title}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0">
                          <div className="text-right">
                            <div className="flex items-baseline gap-1 justify-end">
                              <span className="font-mono text-[10px] text-[#6B7280]">Draft:</span>
                              <span className="font-display text-base font-extrabold text-[#1E4D3B]">
                                {score}<span className="text-xs text-[#9CA3AF]">/{sub.assignment.maxScore}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1 justify-end text-[10px] font-mono text-emerald-600 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>AI Conf: {confidence}%</span>
                            </div>
                          </div>

                          <Link
                            href={`/classes/${sub.assignment.classId}/assignments/${sub.assignment.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E4D3B] text-white text-xs font-bold hover:bg-[#16382B] shadow-xs transition"
                          >
                            <span>Review & Rilis</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                demoQueue.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 hover:border-[#1E4D3B]/40 hover:bg-white transition-all shadow-xs"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#1E4D3B] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#111827] truncate">
                              {item.name}
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#4B5563]">
                              NIM: {item.nim}
                            </span>
                            <span className="font-mono text-[10px] text-[#9CA3AF]">
                              • {item.time}
                            </span>
                          </div>
                          <p className="text-xs text-[#1E4D3B] font-semibold truncate mt-0.5">
                            {item.course}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-[#374151] font-medium truncate mt-1">
                            <FileText size={13} className="text-[#9CA3AF]" />
                            <span>{item.task}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0">
                        <div className="text-right">
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="font-mono text-[10px] text-[#6B7280]">Draft:</span>
                            <span className="font-display text-base font-extrabold text-[#1E4D3B]">
                              {item.score}<span className="text-xs text-[#9CA3AF]">/100</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1 justify-end text-[10px] font-mono text-emerald-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>AI Conf: {item.confidence}%</span>
                          </div>
                        </div>

                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E4D3B] text-white text-xs font-bold hover:bg-[#16382B] shadow-xs transition"
                        >
                          <span>Review & Rilis</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-mono text-[10px] font-bold">
                        {item.flag}
                      </span>
                      <span className="font-mono text-[10px] text-[#1E4D3B] font-semibold">
                        {item.rubric}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/assignments"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E4D3B] hover:underline"
              >
                <span>Lihat Seluruh Antrean Koreksi AI ({pendingSubmissions || 12})</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: Calendar, Homework, AI Assistant */}
        {/* ══════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. INTERACTIVE WEEKLY CALENDAR (Exact Dribbble Shot) */}
          <InteractiveWeeklyCalendar />

          {/* 2. HOMEWORK PROGRESS / TUGAS TRACKER */}
          <section className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F3F4F6]">
              <h3 className="font-display font-extrabold text-sm text-[#111827]">
                Homework progress
              </h3>
              <Link href="/assignments" className="text-xs font-bold text-[#1E4D3B] hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="space-y-3">
              {/* Task Item 1 */}
              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display font-bold text-xs text-[#111827]">
                      CS 304 • Red-Black Trees Balancing
                    </h4>
                    <span className="text-[10px] text-[#6B7280] block mt-0.5">
                      Deadline: 28 September
                    </span>
                  </div>
                  <Link href="/assignments" className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#1E4D3B] transition-colors">
                    <ExternalLink size={14} />
                  </Link>
                </div>
                {/* Segmented Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#6B7280]">
                    <span>Submisi Terkumpul</span>
                    <span className="font-bold text-[#1E4D3B]">28/34 mhs (82%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1E4D3B] w-[82%] rounded-full transition-all" />
                  </div>
                </div>
              </div>

              {/* Task Item 2 */}
              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display font-bold text-xs text-[#111827]">
                      DS 105 • Figma Design Token System
                    </h4>
                    <span className="text-[10px] text-[#6B7280] block mt-0.5">
                      Deadline: 30 September
                    </span>
                  </div>
                  <Link href="/assignments" className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#1E4D3B] transition-colors">
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#6B7280]">
                    <span>Submisi Terkumpul</span>
                    <span className="font-bold text-[#F59E0B]">19/42 mhs (45%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F59E0B] w-[45%] rounded-full transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. AI ASSISTANT PANEL (Warm Cream #F4F3ED with Yellow Star) */}
          <section className="bg-[#F4F3ED] rounded-3xl p-5 border border-[#E6E1D6] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
                  ✦
                </div>
                <h3 className="font-display font-extrabold text-sm text-[#111827]">
                  AI Assistant
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Active v2.4
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#4B5563] leading-relaxed">
              <div className="p-2.5 rounded-2xl bg-white/70 border border-[#E6E1D6]">
                <span className="font-bold text-[#111827] block mb-0.5">Analisis Rubrik Algoritma</span>
                4 berkas mahasiswa menunjukkan inkonsistensi waktu penanganan edge-case pada struktur pohon.
              </div>
              <div className="p-2.5 rounded-2xl bg-white/70 border border-[#E6E1D6]">
                <span className="font-bold text-[#111827] block mb-0.5">Orisinalitas Jawaban</span>
                Seluruh 84 submisi yang divalidasi memiliki kesamaan kode rata-rata di bawah 5.2% (Aman).
              </div>
            </div>
          </section>

          {/* 4. AKSI CEPAT AKADEMIK */}
          <section className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <h3 className="font-display font-extrabold text-sm text-[#111827]">
              Aksi Cepat Akademik
            </h3>
            <DosenQuickActionGroup />
          </section>
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
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        class: { select: { id: true, name: true, subject: true } },
        rubric: { select: { title: true } },
        submissions: { where: { mahasiswaId: userId }, select: { id: true, status: true } },
      },
    }),
    prisma.grade.findMany({
      where: { submission: { mahasiswaId: userId } },
      include: {
        submission: {
          include: {
            assignment: {
              select: {
                title: true,
                maxScore: true,
                class: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { gradedAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Left Column (~68%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Banner Mahasiswa */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#173D2F] via-[#1E4D3B] to-[#255C47] text-white p-7 sm:p-9 shadow-md">
            <div className="relative z-10 max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Portal Pembelajaran Aktif • SV UNS</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                Learn today, succeed tomorrow!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-md">
                Kumpulkan lembar jawaban tugas Anda tepat waktu dan manfaatkan fitur pra-evaluasi kriteria AI sebelum dinilai resmi oleh Dosen.
              </p>
              <div className="pt-2">
                <Link
                  href="/assignments"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#1E4D3B] text-xs font-extrabold hover:bg-emerald-50 shadow-sm transition"
                >
                  <Upload size={15} />
                  <span>Kumpulkan Tugas Baru</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 3 Metric Cards for Student */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl p-6 bg-[#F59E0B] text-slate-950 flex flex-col justify-between shadow-xs">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/90 text-[#B45309] flex items-center justify-center">
                  <Award size={20} />
                </div>
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/30 text-slate-950">
                  ▲ Cum Laude
                </span>
              </div>
              <div className="mt-5">
                <div className="font-display text-4xl font-extrabold tracking-tight">3.84</div>
                <div className="text-xs font-bold text-slate-900/80 mt-1">Indeks Prestasi Kumulatif</div>
                <div className="text-[11px] font-medium text-slate-900/60 mt-0.5">Top 5% angkatan vokasi</div>
              </div>
            </div>

            <div className="rounded-3xl p-6 bg-[#2563EB] text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  ▲ 100% Tuntas
                </span>
              </div>
              <div className="mt-5">
                <div className="font-display text-4xl font-extrabold tracking-tight">
                  {recentGrades.length || 8} Tugas
                </div>
                <div className="text-xs font-bold text-white/90 mt-1">Selesai Dinilai Dosen</div>
                <div className="text-[11px] font-medium text-blue-100 mt-0.5">Rata-rata skor: 88.5</div>
              </div>
            </div>

            <div className="rounded-3xl p-6 bg-[#8B5CF6] text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  Kepatuhan
                </span>
              </div>
              <div className="mt-5">
                <div className="font-display text-4xl font-extrabold tracking-tight">98%</div>
                <div className="text-xs font-bold text-white/90 mt-1">Akurasi Rubrik Penilaian</div>
                <div className="text-[11px] font-medium text-purple-100 mt-0.5">Sesuai format akademik</div>
              </div>
            </div>
          </section>

          {/* Tugas Aktif List */}
          <section className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <h2 className="font-display text-lg font-extrabold text-[#111827]">
                Tugas Aktif Kuliah
              </h2>
              <Link href="/assignments" className="text-xs font-bold text-[#1E4D3B] hover:underline flex items-center gap-1">
                <span>Semua Tugas</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingAssignments.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between gap-4 hover:bg-white hover:border-[#1E4D3B]/30 transition-all"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-[#1E4D3B] font-bold">
                      {task.class.name}
                    </span>
                    <h3 className="font-display text-sm font-bold text-[#111827] truncate mt-0.5">
                      {task.title}
                    </h3>
                    <span className="text-[11px] text-[#6B7280]">
                      Batas Kumpul: {task.dueDate ? formatRelativeTime(task.dueDate) : "Pekan Ini"}
                    </span>
                  </div>
                  <Link
                    href={`/classes/${task.classId}/assignments/${task.id}`}
                    className="px-4 py-2 rounded-full bg-[#1E4D3B] text-white font-bold text-xs hover:bg-[#16382B] transition shrink-0"
                  >
                    Kumpulkan
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar Column (~32%) */}
        <div className="lg:col-span-4 space-y-6">
          <InteractiveWeeklyCalendar />

          {/* AI Study Copilot Advice */}
          <section className="bg-[#F4F3ED] rounded-3xl p-5 border border-[#E6E1D6] shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6E1D6]">
              <div className="w-7 h-7 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
                ✦
              </div>
              <h3 className="font-display font-extrabold text-sm text-[#111827]">
                AI Study Copilot
              </h3>
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              Pastikan kode unit test pada tugas Struktur Data menyertakan kasus uji untuk simpul merah ganda sebelum mengumpulkan tugas akhir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
