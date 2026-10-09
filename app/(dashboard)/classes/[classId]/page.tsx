import { getClassAccess } from "@/lib/auth/class-access";
import {
  publicCriterionSelect,
  publicGradeSelect,
  withReleasedGrade,
} from "@/lib/db/public-selects";
import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  Layers,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  FileCheck,
  ChevronLeft,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegenerateKeyButton } from "@/components/features/regenerate-key-button";
import { AssignmentCard } from "@/components/features/assignment-card";
import { formatDate, getInitials } from "@/lib/utils";

interface ClassDetailPageProps {
  params: Promise<{ classId: string }>;
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId } = await params;
  const access = await getClassAccess(classId, session.user.id);
  if (!access) notFound();
  const canReview = access.isOwner || access.isAssistant;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      dosen: {
        select: { id: true, name: true, email: true },
      },
      enrollments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      rubrics: {
        include: {
          criteria: { select: publicCriterionSelect },
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        where: canReview ? {} : { status: { not: "DRAFT" } },
        include: {
          submissions: {
            where: canReview ? {} : { userId: session.user.id },
            include: {
              grades: canReview
                ? true
                : { where: { status: "RELEASED" }, select: publicGradeSelect },
              versions: true,
            },
          },
          rubric: true,
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!cls) {
    notFound();
  }

  const isDosen = session.user.id === cls.dosenId;
  const isEnrolled = cls.enrollments.some((e) => e.userId === session.user.id);

  if (!isDosen && !isEnrolled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
          <BookOpen size={28} />
        </div>
        <h2 className="text-xl font-semibold font-display text-foreground">Akses Kelas Dibatasi</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Anda tidak terdaftar di kelas ini. Masukkan kode kelas untuk bergabung terlebih dahulu.
        </p>
        <Link
          href="/classes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-none transition"
        >
          <span>Kembali ke Daftar Kelas</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/classes"
          className="hover:text-primary flex items-center gap-1 font-medium transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Semua Kelas Kuliah</span>
        </Link>
      </div>

      {/* Header Banner (Forest Green Dribbble Style) */}
      <div className="border-b border-border pb-7">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-md bg-muted text-primary">
                {cls.subject || "Mata Kuliah"}
              </span>
              {cls.isArchived && (
                <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-md bg-rose-500/20 text-rose-200">
                  Diarsipkan
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold font-display tracking-tight text-foreground leading-tight">
              {cls.name}
            </h1>
            {cls.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {cls.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>
                Pengajar: <strong className="text-foreground">{cls.dosen.name}</strong>
              </span>
              <span>•</span>
              <span>{cls.enrollments.length} Mahasiswa Terdaftar</span>
            </div>
          </div>

          {/* Dosen Enrollment Key Panel */}
          {isDosen && (
            <div className="bg-card text-foreground p-5 rounded-lg border border-border shadow-none space-y-2.5 md:min-w-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Kode Pendaftaran Kelas
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/5 text-primary">
                  Bagikan ke Mhs
                </span>
              </div>
              <RegenerateKeyButton classId={cls.id} initialKey={cls.enrollmentKey} />
              <p className="text-[11px] text-muted-foreground leading-snug">
                Mahasiswa dapat langsung bergabung menggunakan kode token ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="assignments" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <TabsList className="h-auto max-w-full flex-wrap bg-card p-1 rounded-md border border-border shadow-none">
            <TabsTrigger
              value="assignments"
              className="gap-2 rounded-md px-4 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Tugas ({cls.assignments.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="rubrics"
              className="gap-2 rounded-md px-4 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Rubrik ({cls.rubrics.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="gap-2 rounded-md px-4 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Mahasiswa ({cls.enrollments.length})</span>
            </TabsTrigger>
          </TabsList>

          {isDosen && (
            <div className="flex items-center gap-2.5">
              <Link
                href={`/classes/${cls.id}/rubrics`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border bg-card text-primary hover:bg-primary/5 text-xs font-bold transition shadow-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Rubrik</span>
              </Link>
              <Link
                href={`/classes/${cls.id}/assignments/new`}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-none transition active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Tugas Baru</span>
              </Link>
            </div>
          )}
        </div>

        {/* Tab 1: Assignments */}
        <TabsContent value="assignments" className="space-y-6 focus:outline-none">
          {cls.assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-lg border border-dashed border-border bg-card shadow-none">
              <div className="w-14 h-14 rounded-lg bg-primary/5 text-primary flex items-center justify-center mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground font-display">
                Belum Ada Tugas
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5 leading-relaxed">
                {isDosen
                  ? "Buat penugasan pertama untuk kelas ini dan tentukan rubrik penilaian AI yang sesuai."
                  : "Belum ada tugas yang diberikan oleh dosen pengampu saat ini."}
              </p>
              {isDosen && (
                <Link
                  href={`/classes/${cls.id}/assignments/new`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-none cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Tugas Pertama</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cls.assignments.map((assignment) => {
                const studentSub = !isDosen
                  ? assignment.submissions.find((s) => s.userId === session.user.id)
                  : null;

                return (
                  <AssignmentCard
                    key={assignment.id}
                    id={assignment.id}
                    classId={cls.id}
                    title={assignment.title}
                    instructions={assignment.instructions}
                    submissionType={assignment.submissionType}
                    dueDate={assignment.dueDate}
                    maxScore={assignment.maxScore}
                    isDosen={isDosen}
                    submissionCount={assignment.submissions.length}
                    totalStudents={cls.enrollments.length}
                    studentSubmission={studentSub ? withReleasedGrade(studentSub) : null}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Rubrics */}
        <TabsContent value="rubrics" className="space-y-6 focus:outline-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold font-display text-foreground">
                Rubrik Penilaian AI
              </h2>
              <p className="text-xs text-muted-foreground">
                Rubrik digunakan sebagai pedoman objektif bagi AI Copilot dan Dosen saat memeriksa
                jawaban tugas.
              </p>
            </div>
            {isDosen && (
              <Link
                href={`/classes/${cls.id}/rubrics`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Kelola Rubrik</span>
              </Link>
            )}
          </div>

          {cls.rubrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-border bg-card shadow-none">
              <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center text-primary mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold font-display text-foreground">
                Belum Ada Rubrik Penilaian
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
                Buat rubrik dengan kriteria penilaian berbobot (total 100%) agar AI dapat memberikan
                draft penilaian yang presisi.
              </p>
              {isDosen && (
                <Link
                  href={`/classes/${cls.id}/rubrics`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border bg-card text-primary hover:bg-primary/5 text-xs font-bold transition shadow-none"
                >
                  <span>Buat Rubrik Sekarang</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {cls.rubrics.map((rubric: any) => (
                <div
                  key={rubric.id}
                  className="p-6 rounded-lg border border-border bg-card hover:border-border transition-all space-y-4 shadow-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-foreground text-base font-display">
                        {rubric.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dibuat pada {formatDate(rubric.createdAt)} • Dipakai di{" "}
                        {rubric._count.assignments} tugas
                      </p>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-primary/5 text-primary">
                      {rubric.criteria.length} Kriteria
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    {rubric.criteria.map((crit: any) => (
                      <div
                        key={crit.id}
                        className="flex items-center justify-between text-xs bg-muted/40 p-3 rounded-lg border border-border"
                      >
                        <div>
                          <span className="font-bold text-foreground">{crit.label}</span>
                          {crit.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {crit.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Bobot: {crit.weight}%
                          </span>
                          <span className="font-mono font-bold text-primary">
                            Maks {crit.maxScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Enrolled Students */}
        <TabsContent value="members" className="space-y-6 focus:outline-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold font-display text-foreground">
                Daftar Mahasiswa Terdaftar
              </h2>
              <p className="text-xs text-muted-foreground">
                Total {cls.enrollments.length} mahasiswa aktif mengikuti kelas ini.
              </p>
            </div>
          </div>

          {cls.enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-border bg-card shadow-none">
              <Users className="w-10 h-10 text-muted-foreground mb-2" />
              <h3 className="text-base font-semibold font-display text-foreground">
                Belum Ada Mahasiswa
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Bagikan kode kelas{" "}
                <strong className="text-primary font-mono">{cls.enrollmentKey}</strong> kepada
                mahasiswa agar mereka dapat bergabung.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-card shadow-none">
              <div className="divide-y divide-[#F3F4F6]">
                {cls.enrollments.map((enr: any) => (
                  <div
                    key={enr.id}
                    className="flex items-center justify-between p-4 sm:p-5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground font-semibold flex items-center justify-center text-xs font-mono shadow-none">
                        {getInitials(enr.user.name)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{enr.user.name}</p>
                        <p className="text-[11px] text-muted-foreground">{enr.user.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        Bergabung {formatDate(enr.joinedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
