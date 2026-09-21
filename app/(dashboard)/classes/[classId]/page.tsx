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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      dosen: {
        select: { id: true, name: true, email: true },
      },
      enrollments: {
        include: {
          mahasiswa: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      rubrics: {
        include: {
          criteria: true,
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        include: {
          submissions: {
            include: {
              grade: true,
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
  const isEnrolled = cls.enrollments.some((e) => e.mahasiswaId === session.user.id);

  if (!isDosen && !isEnrolled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold font-display text-destructive">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Anda tidak terdaftar di kelas ini. Masukkan kode kelas untuk mendaftar terlebih dahulu.
        </p>
        <Button asChild className="mt-6">
          <Link href="/classes">Kembali ke Daftar Kelas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 via-primary/85 to-accent/90 text-primary-foreground p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs backdrop-blur-sm">
                {cls.subject || "Mata Kuliah"}
              </Badge>
              {cls.isArchived && (
                <Badge variant="destructive" className="text-xs">
                  Diarsipkan
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              {cls.name}
            </h1>
            {cls.description && (
              <p className="text-sm sm:text-base text-white/80 line-clamp-2">
                {cls.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-white/70 pt-2">
              <span>Pengajar: <strong className="text-white">{cls.dosen.name}</strong></span>
              <span>•</span>
              <span>{cls.enrollments.length} Mahasiswa Terdaftar</span>
            </div>
          </div>

          {/* Dosen Enrollment Key Panel */}
          {isDosen && (
            <div className="bg-background/95 backdrop-blur-md text-foreground p-4 rounded-xl border border-border shadow-lg space-y-2 md:min-w-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Kode Pendaftaran
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  Bagikan ke Mhs
                </Badge>
              </div>
              <RegenerateKeyButton classId={cls.id} initialKey={cls.enrollmentKey} />
              <p className="text-[11px] text-muted-foreground">
                Mahasiswa dapat langsung bergabung menggunakan kode ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="assignments" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-2">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="assignments" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span>Tugas ({cls.assignments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rubrics" className="gap-2">
              <Layers className="w-4 h-4" />
              <span>Rubrik Penilaian ({cls.rubrics.length})</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              <span>Mahasiswa ({cls.enrollments.length})</span>
            </TabsTrigger>
          </TabsList>

          {isDosen && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
                <Link href={`/classes/${cls.id}/rubrics`}>
                  <Plus className="w-4 h-4" />
                  Buat Rubrik
                </Link>
              </Button>
              <Button size="sm" asChild className="gap-1.5 bg-primary text-primary-foreground shadow-sm">
                <Link href={`/classes/${cls.id}/assignments/new`}>
                  <Plus className="w-4 h-4" />
                  Buat Tugas Baru
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Tab 1: Assignments */}
        <TabsContent value="assignments" className="space-y-6 focus:outline-none">
          {cls.assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground font-display">Belum Ada Tugas</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
                {isDosen
                  ? "Buat penugasan pertama untuk kelas ini dan tentukan rubrik penilaian AI yang sesuai."
                  : "Belum ada tugas yang diberikan oleh dosen pengampu saat ini."}
              </p>
              {isDosen && (
                <Button size="sm" asChild className="gap-2">
                  <Link href={`/classes/${cls.id}/assignments/new`}>
                    <Plus className="w-4 h-4" />
                    Buat Tugas Pertama
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cls.assignments.map((assignment) => {
                const studentSub = !isDosen
                  ? assignment.submissions.find((s) => s.mahasiswaId === session.user.id)
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
                    studentSubmission={studentSub}
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
              <h2 className="text-lg font-bold font-display text-foreground">Rubrik Penilaian AI</h2>
              <p className="text-xs text-muted-foreground">
                Rubrik digunakan sebagai pedoman objektif bagi AI Copilot dan Dosen saat memeriksa jawaban tugas.
              </p>
            </div>
            {isDosen && (
              <Button size="sm" asChild className="gap-1.5">
                <Link href={`/classes/${cls.id}/rubrics`}>
                  <Plus className="w-4 h-4" />
                  Kelola Rubrik
                </Link>
              </Button>
            )}
          </div>

          {cls.rubrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display">Belum Ada Rubrik Penilaian</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Buat rubrik dengan kriteria penilaian berbobot (total 100%) agar AI dapat memberikan draft penilaian yang presisi.
              </p>
              {isDosen && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/classes/${cls.id}/rubrics`}>Buat Rubrik Sekarang</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cls.rubrics.map((rubric) => (
                <div
                  key={rubric.id}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-foreground text-base font-display">{rubric.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dibuat pada {formatDate(rubric.createdAt)} • Dipakai di {rubric._count.assignments} tugas
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                      {rubric.criteria.length} Kriteria
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    {rubric.criteria.map((crit) => (
                      <div key={crit.id} className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded-lg">
                        <div>
                          <span className="font-semibold text-foreground">{crit.label}</span>
                          {crit.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{crit.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-muted-foreground">Bobot: {crit.weight}%</span>
                          <span className="font-mono font-bold text-primary">Maks {crit.maxScore}</span>
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
              <h2 className="text-lg font-bold font-display text-foreground">Daftar Mahasiswa Terdaftar</h2>
              <p className="text-xs text-muted-foreground">
                Total {cls.enrollments.length} mahasiswa aktif mengikuti kelas ini.
              </p>
            </div>
          </div>

          {cls.enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <Users className="w-10 h-10 text-muted-foreground mb-2" />
              <h3 className="text-base font-bold font-display">Belum Ada Mahasiswa</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Bagikan kode kelas <strong className="text-primary font-mono">{cls.enrollmentKey}</strong> kepada mahasiswa agar mereka dapat bergabung.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="divide-y divide-border/60">
                {cls.enrollments.map((enr, idx) => (
                  <div key={enr.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs font-mono">
                        {getInitials(enr.mahasiswa.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{enr.mahasiswa.name}</p>
                        <p className="text-xs text-muted-foreground">{enr.mahasiswa.email}</p>
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
