import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { BookOpen, Search, FolderKanban } from "lucide-react";
import { ClassCard } from "@/components/features/class-card";
import { CreateClassModal } from "@/components/features/create-class-modal";
import { JoinClassModal } from "@/components/features/join-class-modal";

export const metadata = {
  title: "Daftar Kelas — AI Assessment Copilot • SV UNS",
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
      where: { userId: session.user.id },
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
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B] font-mono text-[11px] font-bold mb-2">
            <span>Faculty & Student Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[#111827]">
            {isDosen ? "Kelas Kuliah yang Anda Ampu" : "Kelas Kuliah yang Diikuti"}
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] mt-1 max-w-2xl">
            {isDosen
              ? "Kelola materi, rubrik penilaian, penugasan, dan evaluasi hasil mahasiswa dengan arsitektur Human-in-the-Loop."
              : "Lihat tugas aktif, kumpulkan lembar jawaban, dan periksa nilai serta umpan balik dari dosen."}
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
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-[#E5E7EB] bg-white shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-[#111827] font-display">
            {isDosen ? "Belum Ada Kelas" : "Belum Mengikuti Kelas"}
          </h3>
          <p className="text-xs text-[#6B7280] max-w-md mt-2 mb-6 leading-relaxed">
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
