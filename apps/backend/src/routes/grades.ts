import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";

const gradesRouter = new Hono<AuthContext>();
gradesRouter.use("*", internalAuthMiddleware);

gradesRouter.get("/", async (c) => {
  const user = c.get("user");

  const candidates = await prisma.gradeRevision.findMany({
    where: { submission: { userId: user.id }, status: "RELEASED" },
    select: {
      id: true,
      finalScore: true,
      finalFeedback: true,
      status: true,
      createdAt: true,
      submissionId: true,
      submission: {
        select: {
          id: true,
          releasedGradeId: true,
          assignment: {
            select: {
              id: true,
              title: true,
              maxScore: true,
              class: { select: { id: true, name: true, subject: true } },
            },
          },
        },
      },
      gradedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grades = candidates.filter((grade) => grade.id === grade.submission.releasedGradeId);

  return c.json(grades);
});

export default gradesRouter;
