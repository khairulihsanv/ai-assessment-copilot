import { redirect } from "next/navigation";
import { AssignmentsView } from "@/components/features/assignments-view";
import { auth } from "@/server/auth/auth";
import { fetchFromBackend } from "@/server/api/backend-client";

export const metadata = {
  title: "Manajemen Tugas & Pembangun Rubrik — AI Assessment Copilot",
};

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const res = await fetchFromBackend("/assignments-overview", {
    userId: session.user.id,
    role: session.user.role,
  });

  if (!res.ok) {
    throw new Error("Gagal memuat ringkasan tugas dari server");
  }

  const data = await res.json();

  if (data.role === "DOSEN") {
    return (
      <AssignmentsView
        userRole="DOSEN"
        classes={data.classes as React.ComponentProps<typeof AssignmentsView>["classes"]}
        rubrics={data.rubrics as React.ComponentProps<typeof AssignmentsView>["rubrics"]}
        userId={session.user.id}
      />
    );
  }

  return (
    <AssignmentsView
      userRole="MAHASISWA"
      enrollments={data.enrollments}
      userId={session.user.id}
    />
  );
}
