import { Layers, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RubricManagementView } from "@/components/features/rubric-management-view";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";

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

  const { data } = await fetchFromBackend<any[]>("/rubrics-hub");
  const classes = data || [];

  // Pick first class or default
  const defaultClass = classes[0];

  if (!defaultClass) {
    return (
      <div className="p-12 text-center bg-card rounded-xl border border-dashed border-border space-y-4 max-w-xl mx-auto shadow-none">
        <div className="w-14 h-14 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mx-auto">
          <Layers size={28} />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold text-foreground">
            Belum Ada Kelas Kuliah
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Buat kelas kuliah terlebih dahulu sebelum merancang rubrik penilaian akademik.
          </p>
        </div>
        <Link
          href="/classes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-none transition active:scale-[0.98]"
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
        <div className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border shadow-none overflow-x-auto">
          <span className="shrink-0 whitespace-nowrap text-xs font-mono font-bold text-primary px-3">
            Pilih Kelas:
          </span>
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}/rubrics`}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-muted border border-border text-xs font-bold text-foreground hover:text-secondary-foreground hover:bg-secondary hover:border-primary/40 transition-all whitespace-nowrap"
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
