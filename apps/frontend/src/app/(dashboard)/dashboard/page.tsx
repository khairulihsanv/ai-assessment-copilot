import { redirect } from "next/navigation";
import {
  type DashboardPayload,
  StudentOverview,
  TeacherOverview,
} from "@/components/features/dashboard-overview";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
export const metadata = { title: "Dashboard — Dexa Assessment" };
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { data, ok } = await fetchFromBackend<DashboardPayload>("/dashboard");
  if (!ok || !data)
    return (
      <section className="dashboard-panel dashboard-empty">
        <h1>Ringkasan belum bisa dimuat.</h1>
        <p>
          Periksa layanan backend, lalu muat ulang halaman ini. Data kelas Anda tidak ditampilkan
          sebagai angka nol.
        </p>
        <a href="/dashboard" className="bounce-button bounce-small">
          Muat ulang
        </a>
      </section>
    );
  return session.user.role === "DOSEN" ? (
    <TeacherOverview
      name={session.user.name || "Dosen"}
      data={data.dosenData || { classes: [], pending: 0, released: 0, queue: [] }}
    />
  ) : (
    <StudentOverview
      name={session.user.name || "Mahasiswa"}
      data={data.studentData || { enrollments: [], tasks: [], grades: [] }}
    />
  );
}
