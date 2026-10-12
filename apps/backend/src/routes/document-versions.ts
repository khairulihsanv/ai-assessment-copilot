import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { internalAuthMiddleware, AuthContext } from "../middleware/auth.js";

const documentVersionsRouter = new Hono<AuthContext>();
documentVersionsRouter.use("*", internalAuthMiddleware);

documentVersionsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const version = await prisma.documentVersion.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          assignment: {
            include: { class: { include: { enrollments: true } } },
          },
        },
      },
      chunks: true,
    },
  });

  if (!version) return c.json({ error: "Not found" }, 404);

  const cls = version.document.assignment.class;
  const isDosen = cls.dosenId === user.id;
  const enrollment = cls.enrollments.find((e) => e.userId === user.id);
  const isAssistant = enrollment?.role === "ASSISTANT";

  if (!isDosen && !isAssistant) return c.json({ error: "Forbidden" }, 403);

  return c.json({
    id: version.id,
    versionNumber: version.versionNumber,
    mimeType: version.mimeType,
    extractionStatus: version.extractionStatus,
    errorMessage: version.errorMessage,
    chunks: version.chunks,
  });
});

import { getStorage } from "../storage/storage.js";

documentVersionsRouter.get("/:id/download", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const version = await prisma.documentVersion.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          assignment: {
            include: { class: { include: { enrollments: true } } },
          },
        },
      },
    },
  });

  if (!version) return c.json({ error: "Not found" }, 404);

  const cls = version.document.assignment.class;
  const isDosen = cls.dosenId === user.id;
  const enrollment = cls.enrollments.find((e) => e.userId === user.id);
  const isAssistant = enrollment?.role === "ASSISTANT";

  if (!isDosen && !isAssistant) return c.json({ error: "Forbidden" }, 403);

  try {
    const storage = getStorage();
    const buffer = await storage.get(version.objectKey);
    c.header("Content-Type", version.mimeType);
    c.header("Content-Disposition", `attachment; filename="${version.objectKey}"`);
    return c.body(new Uint8Array(buffer));
  } catch (error) {
    console.error("Storage error:", error);
    return c.json({ error: "Failed to read file from storage" }, 500);
  }
});

documentVersionsRouter.post("/:id/approve", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  const version = await prisma.documentVersion.findUnique({
    where: { id },
    include: { document: { include: { assignment: true } } },
  });

  if (!version) return c.json({ error: "Not found" }, 404);

  const cls = await prisma.class.findUnique({
    where: { id: version.document.assignment.classId },
  });

  if (!cls || cls.dosenId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (version.extractionStatus !== "REVIEW_REQUIRED") {
    return c.json(
      { error: `Cannot approve document in status: ${version.extractionStatus}` },
      400,
    );
  }

  const updated = await prisma.documentVersion.updateMany({
    where: { id, extractionStatus: "REVIEW_REQUIRED" },
    data: {
      extractionStatus: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    return c.json({ error: "Status dokumen telah berubah. Muat ulang." }, 409);
  }

  return c.json({ success: true, status: "APPROVED", indexingPending: true });
});

export default documentVersionsRouter;
