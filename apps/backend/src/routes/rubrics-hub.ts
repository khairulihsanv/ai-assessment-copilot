import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";

const rubricsHubRouter = new Hono<AuthContext>();
rubricsHubRouter.use("*", internalAuthMiddleware);

rubricsHubRouter.get("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const classes = await prisma.class.findMany({
    where: { dosenId: user.id, isArchived: false },
    select: {
      id: true,
      name: true,
      subject: true,
      rubrics: {
        select: {
          id: true,
          title: true,
          classId: true,
          createdById: true,
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
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(classes);
});

export default rubricsHubRouter;
