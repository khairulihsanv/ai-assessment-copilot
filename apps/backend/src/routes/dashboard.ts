import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";

const dashboardRouter = new Hono<AuthContext>();
dashboardRouter.use("*", internalAuthMiddleware);

dashboardRouter.get("/", async (c) => {
  const user = c.get("user");
  const isDosen = user.role === "DOSEN";

  if (isDosen) {
    const [classes, pending, released, queue] = await Promise.all([
      prisma.class.findMany({
        where: { dosenId: user.id, isArchived: false },
        select: {
          id: true,
          name: true,
          subject: true,
          createdAt: true,
          _count: { select: { enrollments: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.submission.count({
        where: {
          assignment: { class: { dosenId: user.id } },
          activeVersionId: { not: null },
          releasedGradeId: null,
        },
      }),
      prisma.submission.count({
        where: {
          assignment: { class: { dosenId: user.id } },
          releasedGradeId: { not: null },
        },
      }),
      prisma.submission.findMany({
        where: {
          assignment: { class: { dosenId: user.id } },
          activeVersionId: { not: null },
          releasedGradeId: null,
        },
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true } },
          assignment: {
            select: {
              id: true,
              title: true,
              classId: true,
              class: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    return c.json({
      role: "DOSEN" as const,
      dosenData: { classes, pending, released, queue },
    });
  }

  // Student Dashboard
  const [enrollments, tasks, rawGrades] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        class: { select: { id: true, name: true } },
      },
    }),
    prisma.assignment.findMany({
      where: {
        class: { enrollments: { some: { userId: user.id } } },
        status: "PUBLISHED",
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        dueDate: true,
        classId: true,
        class: { select: { name: true } },
        submissions: { where: { userId: user.id }, select: { id: true } },
      },
    }),
    prisma.gradeRevision.findMany({
      where: { submission: { userId: user.id }, status: "RELEASED" },
      select: {
        id: true,
        finalScore: true,
        status: true,
        createdAt: true,
        submission: {
          select: {
            releasedGradeId: true,
            assignment: {
              select: { id: true, classId: true, title: true, maxScore: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currentGrades = rawGrades.filter((g) => g.id === g.submission.releasedGradeId);

  return c.json({
    role: "MAHASISWA" as const,
    studentData: {
      enrollments,
      tasks,
      grades: currentGrades,
    },
  });
});

export default dashboardRouter;
