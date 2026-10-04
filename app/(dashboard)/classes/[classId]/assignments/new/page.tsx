import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { CreateAssignmentForm } from "@/components/features/create-assignment-form";

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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      rubrics: {
        include: { criteria: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cls) {
    notFound();
  }

  if (cls.dosenId !== session.user.id) {
    redirect(`/classes/${classId}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      <CreateAssignmentForm classId={cls.id} className={cls.name} rubrics={cls.rubrics} />
    </div>
  );
}
