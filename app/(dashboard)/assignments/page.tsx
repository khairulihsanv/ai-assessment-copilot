import { publicCriterionSelect, publicGradeSelect, withReleasedGrade } from "@/lib/db/public-selects";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { AssignmentsView } from "@/components/features/assignments-view";

export const metadata = {
  title: "Manajemen Tugas & Pembangun Rubrik — AI Assessment Copilot",
};

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isDosen = session.user.role === "DOSEN";

  if (isDosen) {
    const [classes, rubrics] = await Promise.all([
      prisma.class.findMany({
        where: { dosenId: session.user.id, isArchived: false },
        include: {
          assignments: {
            include: {
              rubric: {
                include: { criteria: true },
              },
              _count: { select: { submissions: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { enrollments: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rubric.findMany({
        where: { class: { dosenId: session.user.id } },
        include: {
          criteria: true,
          class: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return (
      <AssignmentsView
        role="DOSEN"
        classes={classes}
        rubrics={rubrics}
        userId={session.user.id}
      />
    );
  }

  // Mahasiswa View
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      class: {
        include: {
          assignments: {
            where: { status: "PUBLISHED" },
            include: {
              rubric: { include: { criteria: { select: publicCriterionSelect } } },
              submissions: {
                where: { userId: session.user.id },
                include: { grades: { where: { status: "RELEASED" }, select: publicGradeSelect }, versions: true },
              },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  return (
    <AssignmentsView
      role="MAHASISWA"
      enrollments={enrollments.map((enrollment) => ({ ...enrollment, class: { ...enrollment.class, enrollmentKey: "", assignments: enrollment.class.assignments.map((assignment) => ({ ...assignment, submissions: assignment.submissions.map(withReleasedGrade) })) } }))}
      userId={session.user.id}
    />
  );
}
