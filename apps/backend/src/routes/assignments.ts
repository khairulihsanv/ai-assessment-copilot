import { createAssignmentSchema, updateAssignmentSchema } from "@dexa/contracts";
import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";
import {
  publicCriterionSelect,
  publicGradeSelect,
  withReleasedGrade,
} from "../utils/public-selects.js";

const assignmentsRouter = new Hono<AuthContext>();
assignmentsRouter.use("*", internalAuthMiddleware);

// Attached under /classes/:classId/assignments
assignmentsRouter.get("/", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId") as string;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: { where: { userId: user.id } } },
  });

  if (!cls) return c.json({ error: "Not found" }, 404);

  const isDosen = cls.dosenId === user.id;
  const enrollment = cls.enrollments[0];
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) return c.json({ error: "Forbidden" }, 403);

  const assignments = await prisma.assignment.findMany({
    where: { classId, ...(isPrivileged ? {} : { status: { not: "DRAFT" } }) },
    include: {
      rubric: {
        include: {
          criteria: isPrivileged ? true : { select: publicCriterionSelect },
        },
      },
      submissions: {
        where: isPrivileged ? undefined : { userId: user.id },
        include: {
          grades: isPrivileged
            ? true
            : { where: { status: "RELEASED" }, select: publicGradeSelect },
          versions: true,
        },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return c.json(
    isPrivileged
      ? assignments
      : assignments.map((assignment) => ({
          ...assignment,
          submissions: assignment.submissions.map(withReleasedGrade),
        })),
  );
});

assignmentsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Hanya dosen yang dapat membuat tugas" }, 403);

  const classId = c.req.param("classId") as string;
  const cls = await prisma.class.findUnique({ where: { id: classId } });

  if (!cls || cls.dosenId !== user.id) {
    return c.json({ error: "Kelas tidak ditemukan atau Anda bukan pengajar di kelas ini" }, 403);
  }

  const body = await c.req.json();
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: parsed.error.issues[0]?.message ?? "Data tugas tidak valid" }, 400);

  const {
    title,
    instructions,
    submissionType,
    dueDate,
    maxScore,
    allowLateSubmission,
    rubricId,
    status,
  } = parsed.data;

  if (rubricId) {
    const rubric = await prisma.rubric.findFirst({ where: { id: rubricId, classId } });
    if (!rubric) return c.json({ error: "Rubrik yang dipilih tidak ditemukan di kelas ini" }, 400);
  }

  const assignment = await prisma.assignment.create({
    data: {
      classId,
      title,
      instructions,
      submissionType,
      dueDate: new Date(dueDate),
      maxScore,
      allowLateSubmission,
      rubricId: rubricId || null,
      status: status || "PUBLISHED",
    },
    include: { rubric: { include: { criteria: true } } },
  });

  return c.json(assignment, 201);
});

assignmentsRouter.get("/:assignmentId", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId") as string;
  const assignmentId = c.req.param("assignmentId");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: { where: { userId: user.id } } },
  });

  if (!cls) return c.json({ error: "Not found" }, 404);

  const isDosen = cls.dosenId === user.id;
  const enrollment = cls.enrollments[0];
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) return c.json({ error: "Forbidden" }, 403);

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId, ...(isPrivileged ? {} : { status: { not: "DRAFT" } }) },
    include: {
      rubric: {
        include: {
          criteria: isPrivileged ? true : { select: publicCriterionSelect },
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          dosenId: true,
          dosen: { select: { id: true, name: true, email: true } },
          enrollments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      submissions: {
        where: isPrivileged ? undefined : { userId: user.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          grades: isPrivileged
            ? true
            : { where: { status: "RELEASED" }, select: publicGradeSelect },
          evaluations: isPrivileged,
          versions: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!assignment) return c.json({ error: "Tugas tidak ditemukan" }, 404);

  return c.json(
    isPrivileged
      ? assignment
      : {
          ...assignment,
          submissions: assignment.submissions.map(withReleasedGrade),
        },
  );
});

assignmentsRouter.get("/:assignmentId/result", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId") as string;
  const assignmentId = c.req.param("assignmentId");

  const enrollment = await prisma.enrollment.findUnique({
    where: { classId_userId: { classId, userId: user.id } },
  });

  if (!enrollment) return c.json({ error: "Forbidden" }, 403);

  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_userId: {
        assignmentId,
        userId: user.id,
      },
    },
    select: {
      id: true,
      assignmentId: true,
      userId: true,
      activeVersionId: true,
      releasedGradeId: true,
      createdAt: true,
      grades: {
        where: { status: "RELEASED" },
        select: {
          id: true,
          finalScore: true,
          finalFeedback: true,
          isAIAssisted: true,
          status: true,
          createdAt: true,
        },
      },
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
              dosen: { select: { name: true } },
            },
          },
          rubric: {
            select: {
              id: true,
              title: true,
              criteria: { select: publicCriterionSelect },
            },
          },
        },
      },
    },
  });

  if (!submission || submission.assignment.classId !== classId) {
    return c.json({ error: "Hasil tidak ditemukan" }, 404);
  }

  const grade = submission.grades.find((g) => g.id === submission.releasedGradeId);
  if (!grade) {
    return c.json({ error: "Nilai belum dirilis" }, 404);
  }

  return c.json({
    submission,
    grade,
  });
});

assignmentsRouter.patch("/:assignmentId", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Forbidden" }, 403);

  const classId = c.req.param("classId") as string;
  const assignmentId = c.req.param("assignmentId");

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.dosenId !== user.id) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json();
  const parsed = updateAssignmentSchema.safeParse(body);
  if (!parsed.success)
    return c.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, 400);

  if (parsed.data.rubricId) {
    const rubric = await prisma.rubric.findFirst({
      where: { id: parsed.data.rubricId, classId },
      select: { id: true },
    });
    if (!rubric) return c.json({ error: "Rubrik tidak tersedia di kelas ini" }, 400);
  }

  const dataToUpdate: Record<string, unknown> = { ...parsed.data };
  if (dataToUpdate.dueDate) {
    dataToUpdate.dueDate = new Date(dataToUpdate.dueDate as string);
  }

  const updated = await prisma.assignment.update({
    where: { id: assignmentId, classId },
    data: dataToUpdate,
    include: {
      rubric: { include: { criteria: true } },
    },
  });

  return c.json(updated);
});

assignmentsRouter.delete("/:assignmentId", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Forbidden" }, 403);

  const classId = c.req.param("classId") as string;
  const assignmentId = c.req.param("assignmentId");

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.dosenId !== user.id) return c.json({ error: "Forbidden" }, 403);

  await prisma.assignment.delete({ where: { id: assignmentId, classId } });
  return c.json({ success: true, message: "Tugas berhasil dihapus" });
});

import crypto from "node:crypto";
import { processDocumentVersion } from "../parsers/document-parser.js";
import { getStorage } from "../storage/storage.js";

assignmentsRouter.post("/:assignmentId/reference-documents", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId");
  const assignmentId = c.req.param("assignmentId");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: { where: { userId: user.id } } },
  });

  if (!cls) return c.json({ error: "Not found" }, 404);

  const isDosen = cls.dosenId === user.id;
  const isAssistant = cls.enrollments[0]?.role === "ASSISTANT";
  if (!isDosen && !isAssistant) return c.json({ error: "Forbidden" }, 403);

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    select: { id: true },
  });
  if (!assignment) return c.json({ error: "Tugas tidak ditemukan" }, 404);

  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data"))
    return c.json({ error: "Invalid content type" }, 400);

  const formData = await c.req.parseBody();
  const file = formData["file"] as File | undefined;
  const sourceTypeStr = formData["sourceType"] as string;

  if (!file) return c.json({ error: "File tidak ditemukan" }, 400);

  const sourceType = sourceTypeStr === "ANSWER_KEY" ? "ANSWER_KEY" : "MATERIAL";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const size = buffer.length;

  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  const checksum = hash.digest("hex");

  const storage = getStorage();
  const objectKey = await storage.save(file.name, buffer);

  let document = await prisma.document.findFirst({ where: { assignmentId, sourceType } });
  if (!document) {
    document = await prisma.document.create({
      data: { assignmentId, sourceType, ownerId: user.id },
    });
  }

  const latestVersion = await prisma.documentVersion.findFirst({
    where: { documentId: document.id },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: nextVersionNumber,
      objectKey,
      mimeType: file.type || "application/octet-stream",
      checksum,
      size,
      extractionStatus: "UPLOADED",
    },
  });

  // Background task
  setTimeout(() => processDocumentVersion(version.id).catch(console.error), 0);

  return c.json(
    {
      success: true,
      documentId: document.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      status: version.extractionStatus,
    },
    202,
  );
});

assignmentsRouter.post("/:assignmentId/reference-sets", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Unauthorized" }, 401);

  const classId = c.req.param("classId");
  const assignmentId = c.req.param("assignmentId");

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.dosenId !== user.id) return c.json({ error: "Forbidden" }, 403);

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    select: { id: true },
  });
  if (!assignment) return c.json({ error: "Tugas tidak ditemukan" }, 404);

  const body = await c.req.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.documentVersionIds) ||
    !body.documentVersionIds.length ||
    body.documentVersionIds.length > 20 ||
    body.documentVersionIds.some((id: unknown) => typeof id !== "string" || !id)
  ) {
    return c.json({ error: "Pilih 1–20 versi dokumen yang valid" }, 400);
  }

  const documentVersionIds = [...new Set<string>(body.documentVersionIds)];
  const documents = await prisma.documentVersion.findMany({
    where: { id: { in: documentVersionIds }, document: { assignmentId } },
    select: { id: true },
  });

  if (documents.length !== documentVersionIds.length) {
    return c.json({ error: "Dokumen harus berasal dari tugas ini" }, 403);
  }

  const latestVersion = await prisma.referenceSetVersion.findFirst({
    where: { assignmentId },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const referenceSet = await prisma.referenceSetVersion.create({
    data: {
      assignmentId,
      versionNumber: nextVersionNumber,
      documents: {
        create: documentVersionIds.map((id) => ({ documentVersionId: id })),
      },
    },
    include: { documents: true },
  });

  return c.json(referenceSet, 201);
});

export default assignmentsRouter;
