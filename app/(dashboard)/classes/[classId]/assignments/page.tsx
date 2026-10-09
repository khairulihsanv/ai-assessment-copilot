import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import {
  Plus,
  ChevronLeft,
  FileText,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface ClassAssignmentsPageProps {
  params: Promise<{ classId: string }>;
}

export const metadata = {
  title: "Daftar Tugas Kelas — Dexa Assessment",
};

export default async function ClassAssignmentsPage({ params }: ClassAssignmentsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      assignments: {
        include: {
          rubric: { include: { criteria: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!cls) notFound();

  const isDosen = session.user.role === "DOSEN" && cls.dosenId === session.user.id;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Header & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/classes/${classId}`} className="hover:text-primary flex items-center gap-1">
          <ChevronLeft size={14} />
          <span>Kembali ke Kelas {cls.name}</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-[#00174b]">
              {cls.subject || "SV-TI"}
            </span>
            <span className="text-xs text-muted-foreground">
              {cls._count.enrollments} Mahasiswa Terdaftar
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">
            Manajemen Tugas: {cls.name}
          </h1>
          <p className="text-xs text-[#434655] mt-0.5">
            Daftar tugas, tenggat waktu pengumpulan, dan rubrik evaluasi AI
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/classes/${classId}/rubrics`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-primary hover:bg-muted transition shadow-none"
          >
            <Layers size={14} />
            <span>Rubrik Kelas</span>
          </Link>
          {isDosen && (
            <Link
              href={`/classes/${classId}/assignments/new`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-none transition active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>+ Buat Tugas Baru</span>
            </Link>
          )}
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cls.assignments.length > 0 ? (
          cls.assignments.map((asmt) => (
            <div
              key={asmt.id}
              className="p-5 rounded-lg bg-card border border-border shadow-none flex flex-col justify-between hover:shadow-none transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-primary">
                    {asmt.maxScore} Poin
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {asmt._count.submissions} Submisi
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{asmt.title}</h3>
                <p className="text-xs text-[#434655] line-clamp-2 leading-relaxed">
                  {asmt.instructions}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-muted-foreground">
                  Tenggat: {formatRelativeTime(asmt.dueDate)}
                </span>
                <Link
                  href={`/classes/${classId}/assignments/${asmt.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Buka Studio</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-12 text-center bg-card rounded-lg border border-dashed border-border space-y-3">
            <FileText size={32} className="mx-auto text-muted-foreground" />
            <h3 className="font-display text-base font-bold text-foreground">
              Belum Ada Tugas di Kelas Ini
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Rilis penugasan pertama lengkap dengan rubrik analitis untuk memfasilitasi evaluasi AI
              Copilot.
            </p>
            {isDosen && (
              <Link
                href={`/classes/${classId}/assignments/new`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-none hover:bg-primary/90"
              >
                <Plus size={14} />
                <span>Buat Tugas Sekarang</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
