import { redirect } from "next/navigation";
import { type AnalyticsData, AnalyticsReport } from "@/components/features/analytics-report";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
export const metadata = { title: "Laporan kelas — Dexa Assessment" };
export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DOSEN") redirect("/dashboard");
  const { data, ok } = await fetchFromBackend<AnalyticsData>("/analytics");
  if (!ok || !data)
    return (
      <div className="dashboard-panel dashboard-empty">
        <h1>Laporan belum bisa dimuat.</h1>
        <p>Periksa layanan backend, lalu coba lagi.</p>
        <a href="/analytics" className="bounce-button">
          Muat ulang
        </a>
      </div>
    );
  return (
    <AnalyticsReport
      data={{
        ...data,
        distribution: data.distribution || [],
        gradeRows: data.gradeRows || [],
        releasedCount: data.releasedCount ?? 0,
      }}
    />
  );
}
