import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";
import {
  publicCriterionSelect,
  publicGradeSelect,
  withReleasedGrade,
} from "../utils/public-selects.js";

const assignmentsOverviewRouter = new Hono<AuthContext>();
assignmentsOverviewRouter.use("*", internalAuthMiddleware);

assignmentsOverviewRouter.get("/", async (c) => {
  const user = c.get("user");
  const isDosen = user.role === "DOSEN";

  if (isDosen) {
    const [classes, rubrics] = await Promise.all([
      prisma.class.findMany({
        where: { dosenId: user.id, isArchived: false },
        select: {
          id: true,
          name: true,
          subject: true,
          assignments: {
            select: {
              id: true,
              title: true,
              instructions: true,
              dueDate: true,
              maxScore: true,
              status: true,
              classId: true,
              rubricId: true,
              createdAt: true,
              rubric: {
                select: {
                  id: true,
                  title: true,
                  criteria: {
                    select: {
                      id: true,
                      label: true,
                      description: true,
                      maxScore: true,
                      weight: true,
                      rubricId: true,
                    },
                  },
                },
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
        where: { class: { dosenId: user.id } },
        select: {
          id: true,
          title: true,
          classId: true,
          createdAt: true,
          criteria: {
            select: {
              id: true,
              label: true,
              description: true,
              maxScore: true,
              weight: true,
              rubricId: true,
            },
          },
          class: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return c.json({
      role: "DOSEN" as const,
      classes,
      rubrics,
    });
  }

  // Student view
  const rawEnrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      role: true,
      classId: true,
      userId: true,
      joinedAt: true,
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          assignments: {
            where: { status: "PUBLISHED" },
            select: {
              id: true,
              title: true,
              dueDate: true,
              maxScore: true,
              status: true,
              classId: true,
              rubric: {
                select: {
                  id: true,
                  title: true,
                  criteria: { select: publicCriterionSelect },
                },
              },
              submissions: {
                where: { userId: user.id },
                select: {
                  id: true,
                  assignmentId: true,
                  userId: true,
                  activeVersionId: true,
                  releasedGradeId: true,
                  createdAt: true,
                  grades: {
                    where: { status: "RELEASED" },
                    orderBy: { createdAt: "desc" },
                    select: publicGradeSelect,
                  },
                  versions: {
                    select: {
                      id: true,
                      versionNumber: true,
                      type: true,
                      submittedAt: true,
                    },
                  },
                },
              },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  const enrollments = rawEnrollments.map((enrollment) => ({
    ...enrollment,
    class: {
      ...enrollment.class,
      enrollmentKey: "",
      assignments: enrollment.class.assignments.map((assignment) => ({
        ...assignment,
        submissions: assignment.submissions.map(withReleasedGrade),
      })),
    },
  }));

  return c.json({
    role: "MAHASISWA" as const,
    enrollments,
  });
});

export default assignmentsOverviewRouter;
