import { BarChart3, BookOpen, ClipboardList, Files, History } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExportAnalyticsButton } from "@/components/features/dashboard-quick-actions";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";

export const metadata = { title: "Laporan & Analitik — AI Assessment Copilot" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DOSEN") redirect("/dashboard");

  const { ok, data } = await fetchFromBackend<{
    classesCount: number;
    assignmentsCount: number;
    submissionsCount: number;
    gradesCount: number;
  }>("/analytics");
  const metrics =
    ok && data
      ? [
          {
            label: "Kelas",
            value: data.classesCount,
            detail: "Termasuk kelas yang diarsipkan",
            icon: BookOpen,
          },
          {
            label: "Penugasan",
            value: data.assignmentsCount,
            detail: "Seluruh tugas di kelas Anda",
            icon: ClipboardList,
          },
          {
            label: "Pengumpulan",
            value: data.submissionsCount,
            detail: "Jawaban yang telah dikumpulkan",
            icon: Files,
          },
          {
            label: "Revisi penilaian",
            value: data.gradesCount,
            detail: "Termasuk draf dan revisi nilai Anda",
            icon: History,
          },
        ]
      : null;

  return (
    <div className="space-y-7 pb-12">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Rekap kelas
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <BarChart3 className="shrink-0 text-primary" size={26} /> Laporan & Analitik Akademik
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ringkasan kegiatan dan penilaian di kelas yang Anda kelola.
          </p>
        </div>
        <ExportAnalyticsButton />
      </div>
      {metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, detail, icon: Icon }) => (
            <section
              key={label}
              aria-label={label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
                <Icon size={19} className="text-primary" />
              </div>
              <p
                className="mt-5 text-4xl font-semibold tabular-nums text-foreground"
                data-metric-value
              >
                {value.toLocaleString("id-ID")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
            </section>
          ))}
        </div>
      ) : (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-foreground"
        >
          Ringkasan belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.
        </div>
      )}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Tinjau hasil penilaian</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Buka kelas untuk meninjau pengumpulan dan nilai setiap tugas. Distribusi nilai dan capaian
          pembelajaran belum tersedia pada laporan ini.
        </p>
        <Link
          href="/classes"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Buka kelas
        </Link>
      </section>
    </div>
  );
}
