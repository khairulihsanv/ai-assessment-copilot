import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { RubricManagementView } from "@/components/features/rubric-management-view";

interface RubricsPageProps {
  params: Promise<{ classId: string }>;
}

export const metadata = {
  title: "Manajemen Rubrik Penilaian — AI Assessment Copilot",
};

export default async function RubricsPage({ params }: RubricsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, dosenId: true },
  });

  if (!cls) {
    notFound();
  }

  if (cls.dosenId !== session.user.id) {
    redirect(`/classes/${classId}`);
  }

  const rubrics = await prisma.rubric.findMany({
    where: { classId },
    include: {
      criteria: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-in fade-in-50 duration-300">
      <RubricManagementView
        classId={cls.id}
        className={cls.name}
        initialRubrics={rubrics}
      />
    </div>
  );
}
