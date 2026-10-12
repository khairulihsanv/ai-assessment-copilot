import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { internalAuthMiddleware, type AuthContext } from "../middleware/auth.js";

const gradingHubRouter = new Hono<AuthContext>();
gradingHubRouter.use("*", internalAuthMiddleware);

gradingHubRouter.get("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const submissions = await prisma.submission.findMany({
    where: {
      assignment: { class: { dosenId: user.id } },
    },
    select: {
      id: true,
      assignmentId: true,
      activeVersionId: true,
      releasedGradeId: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          classId: true,
          class: { select: { name: true, subject: true } },
          rubric: { select: { title: true } },
        },
      },
      grades: {
        where: { status: "RELEASED" },
        select: {
          id: true,
          finalScore: true,
          status: true,
          createdAt: true,
        },
      },
      evaluations: {
        select: {
          id: true,
          versionId: true,
          suggestedTotalScore: true,
          status: true,
        },
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
    orderBy: { createdAt: "desc" },
  });

  const rows = submissions.map((s) => ({
    ...s,
    released: s.grades.find((g) => g.id === s.releasedGradeId) || null,
    hasDraft: s.evaluations.some((e) => e.versionId === s.activeVersionId),
  }));

  return c.json(rows);
});

export default gradingHubRouter;
