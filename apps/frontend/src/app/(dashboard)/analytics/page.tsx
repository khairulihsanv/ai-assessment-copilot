import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";

export const metadata = { title: "Analitik penilaian" };

interface Analytics {
  classesCount: number;
  assignmentsCount: number;
  submissionsCount: number;
  gradesCount: number;
  evaluatedCount: number;
  pendingReviewCount: number;
  aiAdoptionRate: number | null;
  aiEditedRate: number | null;
  meanAbsoluteDeviation: number | null;
  averageScore: number | null;
  decisionCounts: Record<"accepted" | "edited" | "rejected" | "manual", number>;
  scoreDistribution: { label: string; count: number }[];
  criterionDeviation: {
    criterionId: string;
    label: string;
    assignmentTitle: string;
    meanAbsoluteDeviation: number | null;
    samples: number;
  }[];
  assignments: {
    id: string;
    classId: string;
    title: string;
    className: string;
    submissions: number;
    evaluated: number;
    graded: number;
    averageAI: number | null;
    averageFinal: number | null;
  }[];
}

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const pct = (v: number | null) => (v === null ? "—" : `${nf.format(v * 100)}%`);
const num = (v: number | null) => (v === null ? "—" : nf.format(v));

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 text-2xl font-semibold">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{detail}</dd>
    </div>
  );
}

/** Single-series horizontal bar list: label, bar, value as text (readable without colour). */
function BarList({
  title,
  description,
  rows,
  max,
  format,
  empty,
}: {
  title: string;
  description: string;
  rows: { key: string; label: string; sublabel?: string; value: number }[];
  max: number;
  format: (v: number) => string;
  empty: string;
}) {
  return (
    <section aria-label={title} className="min-w-0 rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.key} title={`${r.label}: ${format(r.value)}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">
                  {r.label}
                  {r.sublabel && (
                    <span className="ml-1.5 text-xs text-muted-foreground">{r.sublabel}</span>
                  )}
                </span>
                <span className="tabular shrink-0 font-medium">{format(r.value)}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${max > 0 && r.value > 0 ? Math.max(2, (r.value / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DOSEN") redirect("/dashboard");

  const { ok, data } = await fetchFromBackend<Analytics>("/analytics");

  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
          Analitik penilaian
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Seberapa sering draf AI dipakai dan seberapa jauh nilainya dari keputusan akhir Anda. Skor
          ditampilkan dalam skala 0–100 agar tugas dengan skor maksimal berbeda bisa dibandingkan.
        </p>
      </header>

      {!ok || !data ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg"
        >
          Data analitik tidak dapat dimuat. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : data.submissionsCount === 0 ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Belum ada data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Analitik muncul setelah mahasiswa mengumpulkan tugas dan Anda merilis nilai.{" "}
            <Link href="/classes" className="text-primary underline underline-offset-4">
              Buka kelas Anda
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="Nilai dirilis"
              value={num(data.gradesCount)}
              detail={`dari ${num(data.submissionsCount)} pengumpulan`}
            />
            <Stat
              label="Menunggu tinjauan"
              value={num(data.pendingReviewCount)}
              detail="sudah ada draf AI, belum dirilis"
            />
            <Stat label="Rata-rata nilai" value={num(data.averageScore)} detail="skala 0–100" />
            <Stat
              label="Memakai draf AI"
              value={pct(data.aiAdoptionRate)}
              detail="dari nilai yang dirilis"
            />
            <Stat
              label="Draf diubah"
              value={pct(data.aiEditedRate)}
              detail="dari nilai berbantuan AI"
            />
            <Stat
              label="Selisih AI vs final"
              value={num(data.meanAbsoluteDeviation)}
              detail="rata-rata selisih mutlak, poin"
            />
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarList
              title="Sebaran nilai akhir"
              description="Jumlah nilai dirilis per rentang (skala 0–100)."
              rows={data.scoreDistribution.map((b) => ({
                key: b.label,
                label: b.label,
                value: b.count,
              }))}
              max={Math.max(0, ...data.scoreDistribution.map((b) => b.count))}
              format={(v) => `${nf.format(v)} nilai`}
              empty="Belum ada nilai yang dirilis."
            />
            <BarList
              title="Kriteria dengan selisih terbesar"
              description="Rata-rata selisih mutlak skor AI dan skor final per kriteria (persen dari skor maksimal)."
              rows={data.criterionDeviation.slice(0, 8).map((c) => ({
                key: c.criterionId,
                label: c.label,
                sublabel: `${c.assignmentTitle} · ${c.samples}×`,
                value: c.meanAbsoluteDeviation ?? 0,
              }))}
              max={Math.max(0, ...data.criterionDeviation.map((c) => c.meanAbsoluteDeviation ?? 0))}
              format={(v) => `${nf.format(v)}%`}
              empty="Muncul setelah Anda merilis nilai per kriteria dari draf AI."
            />
          </div>

          <section
            aria-labelledby="decisions-heading"
            className="rounded-xl border border-border bg-card p-4"
          >
            <h2 id="decisions-heading" className="text-base font-semibold">
              Keputusan per kriteria
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["accepted", "Diterima"],
                  ["edited", "Diubah"],
                  ["rejected", "Ditolak"],
                  ["manual", "Dinilai manual"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-lg bg-muted px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="tabular text-lg font-semibold">
                    {num(data.decisionCounts[key] ?? 0)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-labelledby="per-assignment-heading"
            className="rounded-xl border border-border bg-card"
          >
            <h2 id="per-assignment-heading" className="px-4 pt-4 text-base font-semibold">
              Per tugas
            </h2>
            <p className="px-4 text-xs text-muted-foreground">
              Rata-rata AI dihitung dari draf terbaru tiap pengumpulan; rata-rata final dari nilai
              yang dirilis.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-y border-border bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Tugas
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Pengumpulan
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Draf AI
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Dirilis
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Rata-rata AI
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Rata-rata final
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/classes/${a.classId}/assignments/${a.id}`}
                          className="font-medium hover:underline"
                        >
                          {a.title}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{a.className}</span>
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">{num(a.submissions)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{num(a.evaluated)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{num(a.graded)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{num(a.averageAI)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{num(a.averageFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
