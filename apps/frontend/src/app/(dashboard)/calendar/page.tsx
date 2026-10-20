import { redirect } from "next/navigation";
import type { ClassPayload, EnrollmentPayload } from "@/components/features/assignments-view";
import { DeadlineCalendar } from "@/components/features/deadline-calendar";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";
export const metadata = { title: "Kalender tugas — Dexa Assessment" };
export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { data, ok } = await fetchFromBackend<{
    classes?: ClassPayload[];
    enrollments?: EnrollmentPayload[];
  }>("/assignments-overview");
  if (!ok)
    return (
      <div className="dashboard-empty dashboard-panel">
        <h1>Kalender belum bisa dimuat.</h1>
        <p>Periksa layanan backend, lalu muat ulang halaman.</p>
        <a href="/calendar" className="bounce-button">
          Coba lagi
        </a>
      </div>
    );
  const classes = data?.classes || data?.enrollments?.map((e) => e.class) || [];
  return (
    <DeadlineCalendar
      tasks={classes.flatMap((c) =>
        (c.assignments || [])
          .filter((a) => a.status !== "CLOSED")
          .map((a) => ({
            id: a.id,
            classId: c.id,
            title: a.title,
            className: c.name,
            dueDate: new Date(a.dueDate).toISOString(),
          })),
      )}
    />
  );
}
