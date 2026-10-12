import { notFound, redirect } from "next/navigation";
import { RubricManagementView } from "@/components/features/rubric-management-view";
import { auth } from "@/server/auth/auth";
import { fetchFromBackend } from "@/server/api/backend-client";

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

  const classRes = await fetchFromBackend<{ id: string; name: string; dosenId: string }>(
    `/classes/${classId}`
  );

  if (!classRes.data) {
    notFound();
  }

  const cls = classRes.data;

  if (cls.dosenId !== session.user.id) {
    redirect(`/classes/${classId}`);
  }

  const rubricsRes = await fetchFromBackend<any[]>(`/classes/${classId}/rubrics`);
  const rubrics = rubricsRes.data || [];

  return (
    <div className="animate-in fade-in-50 duration-300">
      <RubricManagementView classId={cls.id} className={cls.name} initialRubrics={rubrics} />
    </div>
  );
}
