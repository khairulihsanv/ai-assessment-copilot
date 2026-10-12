import { notFound, redirect } from "next/navigation";
import { CreateAssignmentForm } from "@/components/features/create-assignment-form";
import { auth } from "@/server/auth/auth";
import { fetchFromBackend } from "@/server/api/backend-client";

interface NewAssignmentPageProps {
  params: Promise<{ classId: string }>;
}

export const metadata = {
  title: "Buat Tugas Baru — Dexa Assessment",
};

export default async function NewAssignmentPage({ params }: NewAssignmentPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId } = await params;

  const res = await fetchFromBackend(`/classes/${classId}`, {
    userId: session.user.id,
    role: session.user.role,
  });

  if (res.status === 404 || res.status === 403) {
    notFound();
  }

  if (!res.ok) {
    notFound();
  }

  const cls = await res.json();

  if (cls.dosenId !== session.user.id) {
    redirect(`/classes/${classId}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      <CreateAssignmentForm classId={cls.id} className={cls.name} rubrics={cls.rubrics} />
    </div>
  );
}
