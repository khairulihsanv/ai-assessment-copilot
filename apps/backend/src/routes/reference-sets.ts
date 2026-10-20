import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";

const referenceSetsRouter = new Hono<AuthContext>();
referenceSetsRouter.use("*", internalAuthMiddleware);

referenceSetsRouter.post("/:id/approve", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  const version = await prisma.referenceSetVersion.findUnique({
    where: { id },
    include: { assignment: true, documents: { include: { documentVersion: true } } },
  });

  if (!version) {
    return c.json({ error: "Not found" }, 404);
  }

  const cls = await prisma.class.findUnique({
    where: { id: version.assignment.classId },
  });

  if (!cls || cls.dosenId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (version.documents.length === 0) {
    return c.json({ error: "Set acuan harus memiliki dokumen" }, 400);
  }

  // Check if all underlying documents are READY
  const notReadyDocs = version.documents.filter(
    (d) => d.documentVersion.extractionStatus !== "READY",
  );

  if (notReadyDocs.length > 0) {
    return c.json(
      {
        error: "Cannot approve Reference Set because some documents are not READY",
        notReadyDocs: notReadyDocs.map((d) => ({
          id: d.documentVersion.id,
          status: d.documentVersion.extractionStatus,
        })),
      },
      400,
    );
  }

  const updated = await prisma.referenceSetVersion.update({
    where: { id },
    data: {
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  return c.json({ success: true, referenceSet: updated });
});

export default referenceSetsRouter;
