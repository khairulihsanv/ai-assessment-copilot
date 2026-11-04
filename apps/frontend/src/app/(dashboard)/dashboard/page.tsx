import { redirect } from "next/navigation";
import { DosenDashboard, type DosenDashboardData } from "@/components/features/dosen-dashboard";
import {
  StudentDashboard,
  type StudentDashboardData,
} from "@/components/features/student-dashboard";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";

export const metadata = { title: "Beranda — Dexa Assessment" };

function greetingNow() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data, ok } = await fetchFromBackend<{
    role: "DOSEN" | "MAHASISWA";
    dosenData?: DosenDashboardData;
    studentData?: StudentDashboardData;
  }>("/dashboard");

  const greeting = greetingNow();

  return session.user.role === "DOSEN" ? (
    <DosenDashboard
      name={session.user.name || "Dosen"}
      greeting={greeting}
      unavailable={!ok || !data?.dosenData}
      data={data?.dosenData ?? { classes: [], pending: 0, released: 0, queue: [], recent: [] }}
    />
  ) : (
    <StudentDashboard
      name={session.user.name || "Mahasiswa"}
      greeting={greeting}
      data={data?.studentData ?? { enrollments: [], tasks: [], grades: [] }}
    />
  );
}
