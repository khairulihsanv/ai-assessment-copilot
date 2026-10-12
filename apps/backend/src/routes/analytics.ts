import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { internalAuthMiddleware, type AuthContext } from "../middleware/auth.js";

const analyticsRouter = new Hono<AuthContext>();
analyticsRouter.use("*", internalAuthMiddleware);

analyticsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const [classesCount, assignmentsCount, submissionsCount, gradesCount] = await Promise.all([
    prisma.class.count({ where: { dosenId: user.id } }),
    prisma.assignment.count({ where: { class: { dosenId: user.id } } }),
    prisma.submission.count({ where: { assignment: { class: { dosenId: user.id } } } }),
    prisma.gradeRevision.count({ where: { gradedById: user.id } }),
  ]);

  return c.json({
    classesCount,
    assignmentsCount,
    submissionsCount,
    gradesCount,
  });
});

export default analyticsRouter;
