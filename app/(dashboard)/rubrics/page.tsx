import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Layers, Plus, BookOpen, ArrowRight } from "lucide-react";
import { RubricManagementView } from "@/components/features/rubric-management-view";

export const metadata = {
  title: "Pembangun Rubrik Interaktif — AI Assessment Copilot",
};

export default async function RubricsGlobalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isDosen = session.user.role === "DOSEN";
  if (!isDosen) {
    redirect("/dashboard");
  }

  const classes = await prisma.class.findMany({
    where: { dosenId: session.user.id, isArchived: false },
    include: {
      rubrics: {
        include: {
          criteria: true,
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Pick first class or default
  const defaultClass = classes[0];

  if (!defaultClass) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#E5E7EB] space-y-4 max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center mx-auto">
          <Layers size={28} />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-extrabold text-[#111827]">
            Belum Ada Kelas Kuliah
          </h2>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto leading-relaxed">
            Buat kelas kuliah terlebih dahulu sebelum merancang rubrik penilaian akademik.
          </p>
        </div>
        <Link
          href="/classes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold shadow-xs transition active:scale-[0.98]"
        >
          <Plus size={15} />
          <span>Buat Kelas Kuliah</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Class Switcher Bar if multiple classes */}
      {classes.length > 1 && (
        <div className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-x-auto">
          <span className="text-xs font-mono font-bold text-[#1E4D3B] px-3">
            Pilih Kelas:
          </span>
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}/rubrics`}
              className="px-3.5 py-1.5 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-bold text-[#374151] hover:text-[#1E4D3B] hover:bg-[#E2EFE9] hover:border-[#C5DDD1] transition-all whitespace-nowrap"
            >
              {c.name} ({c.rubrics.length} Rubrik)
            </Link>
          ))}
        </div>
      )}

      <RubricManagementView
        classId={defaultClass.id}
        className={defaultClass.name}
        initialRubrics={defaultClass.rubrics}
      />
    </div>
  );
}
