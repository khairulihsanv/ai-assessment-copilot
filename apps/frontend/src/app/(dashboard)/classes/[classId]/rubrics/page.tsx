import { notFound, redirect } from "next/navigation";
import { RubricManagementView } from "@/components/features/rubric-management-view";
import { fetchFromBackend } from "@/server/api/backend-client";
import { auth } from "@/server/auth/auth";

interface RubricsPageProps {
  params: Promise<{ classId: string }>;
}

export const metadata = {
  title: "Manajemen Rubrik Penilaian — Dexa Assessment",
};

export default async function RubricsPage({ params }: RubricsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId } = await params;

  // Both requests at once: each one is a round trip to the backend. The backend checks
  // access on the rubric list itself, so starting it before the ownership check is safe.
  const [classRes, rubricsRes] = await Promise.all([
    fetchFromBackend<{ id: string; name: string; dosenId: string }>(`/classes/${classId}`),
    fetchFromBackend<any[]>(`/classes/${classId}/rubrics`),
  ]);

  if (!classRes.data) {
    notFound();
  }

  const cls = classRes.data;

  if (cls.dosenId !== session.user.id) {
    redirect(`/classes/${classId}`);
  }

  const rubrics = rubricsRes.data || [];

  return (
    <div className="animate-in fade-in-50 duration-300">
      <RubricManagementView classId={cls.id} className={cls.name} initialRubrics={rubrics} />
    </div>
  );
}
