import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { BookOpen, Search, FolderKanban } from "lucide-react";
import { ClassCard } from "@/components/features/class-card";
import { CreateClassModal } from "@/components/features/create-class-modal";
import { JoinClassModal } from "@/components/features/join-class-modal";

export const metadata = {
  title: "Daftar Kelas — Dexa Assessment",
};

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isDosen = session.user.role === "DOSEN";

  let classes = [];

  if (isDosen) {
    classes = await prisma.class.findMany({
      where: { dosenId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            enrollments: true,
            assignments: true,
          },
        },
      },
    });
  } else {
    const enrollments = await prisma.enrollment.findMany({
      where: { mahasiswaId: session.user.id },
      orderBy: { joinedAt: "desc" },
      include: {
        class: {
          include: {
            dosen: {
              select: { name: true },
            },
            _count: {
              select: {
                assignments: true,
              },
            },
          },
        },
      },
    });
    classes = enrollments.map((e) => e.class);
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display text-foreground">
            {isDosen ? "Kelas yang Anda Ampu" : "Kelas yang Diikuti"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isDosen
              ? "Kelola materi, rubrik penilaian, penugasan, dan evaluasi hasil mahasiswa dengan AI."
              : "Lihat tugas aktif, kumpulkan jawaban, dan periksa nilai serta umpan balik dari dosen."}
          </p>
        </div>

        <div>
          {isDosen ? (
            <CreateClassModal />
          ) : (
            <JoinClassModal />
          )}
        </div>
      </div>

      {/* Classes Grid or Empty State */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground font-display">
            {isDosen ? "Belum Ada Kelas" : "Belum Mengikuti Kelas"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6">
            {isDosen
              ? "Mulai dengan membuat kelas perkuliahan pertama Anda untuk membagikan tugas dan menggunakan asisten AI."
              : "Masukkan kode kelas dari dosen pengajar Anda untuk mulai mengikuti perkuliahan dan mengerjakan tugas."}
          </p>
          {isDosen ? (
            <CreateClassModal />
          ) : (
            <JoinClassModal />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => {
            const studentCount = "enrollments" in c._count ? c._count.enrollments : 0;
            const dosenName = "dosen" in c && c.dosen ? (c.dosen as { name: string }).name : undefined;

            return (
              <ClassCard
                key={c.id}
                id={c.id}
                name={c.name}
                subject={c.subject}
                description={c.description}
                enrollmentKey={isDosen ? c.enrollmentKey : undefined}
                studentCount={studentCount}
                dosenName={dosenName}
                isDosen={isDosen}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
