import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { createRubricSchema, updateRubricSchema } from "@dexa/contracts";
import { internalAuthMiddleware, AuthContext } from "../middleware/auth.js";
import { publicCriterionSelect } from "../utils/public-selects.js";
import { generateEmbedding } from "../ai/embedding-client.js";

const rubricsRouter = new Hono<AuthContext>();
rubricsRouter.use("*", internalAuthMiddleware);

// Attached under /classes/:classId/rubrics
rubricsRouter.get("/", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId") as string;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: true },
  });

  if (!cls) return c.json({ error: "Kelas tidak ditemukan" }, 404);

  const isDosen = cls.dosenId === user.id;
  const enrollment = cls.enrollments.find((e) => e.userId === user.id);
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) return c.json({ error: "Akses ditolak" }, 403);

  const rubrics = await prisma.rubric.findMany({
    where: { classId },
    include: {
      criteria: isPrivileged ? true : { select: publicCriterionSelect },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(rubrics);
});

rubricsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Hanya dosen yang dapat membuat rubrik penilaian" }, 403);

  const classId = c.req.param("classId") as string;
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  
  if (!cls || cls.dosenId !== user.id) {
    return c.json({ error: "Kelas tidak ditemukan atau Anda bukan pengajar di kelas ini" }, 403);
  }

  const body = await c.req.json();
  const parsed = createRubricSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Data rubrik tidak valid" }, 400);

  const { title, criteria } = parsed.data;

  // Generate embeddings for answer keys and materials
  const criteriaWithEmbeddings = await Promise.all(
    criteria.map(async (cr) => {
      let answerKeyEmbedding: number[] | undefined;
      let materialEmbedding: number[] | undefined;

      if (cr.answerKey && cr.answerKey.trim()) {
        try {
          const result = await generateEmbedding(cr.answerKey);
          answerKeyEmbedding = result.embedding;
        } catch (err) {
          console.warn("[Rubric API] Gagal embed kunci jawaban:", err);
        }
      }

      if (cr.material && cr.material.trim()) {
        try {
          const result = await generateEmbedding(cr.material);
          materialEmbedding = result.embedding;
        } catch (err) {
          console.warn("[Rubric API] Gagal embed materi:", err);
        }
      }

      return {
        label: cr.label,
        description: cr.description || null,
        expectedAnswer: cr.expectedAnswer || null,
        answerKey: cr.answerKey || null,
        material: cr.material || null,
        answerKeyEmbedding: answerKeyEmbedding ?? undefined,
        materialEmbedding: materialEmbedding ?? undefined,
        maxScore: cr.maxScore,
        weight: cr.weight,
      };
    }),
  );

  const rubric = await prisma.rubric.create({
    data: {
      title,
      classId,
      createdById: user.id,
      criteria: { create: criteriaWithEmbeddings },
    },
    include: { criteria: true },
  });

  return c.json(rubric, 201);
});

rubricsRouter.get("/:rubricId", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId") as string;
  const rubricId = c.req.param("rubricId") as string;

  const rubric = await prisma.rubric.findFirst({
    where: { id: rubricId, classId },
    include: {
      criteria: true,
      _count: { select: { assignments: true } },
    },
  });

  if (!rubric) return c.json({ error: "Rubrik tidak ditemukan" }, 404);
  return c.json(rubric);
});

rubricsRouter.delete("/:rubricId", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Forbidden" }, 403);

  const classId = c.req.param("classId") as string;
  const rubricId = c.req.param("rubricId") as string;

  const rubric = await prisma.rubric.findFirst({
    where: { id: rubricId, classId },
    include: { _count: { select: { assignments: true } } },
  });

  if (!rubric) return c.json({ error: "Rubrik tidak ditemukan" }, 404);

  if (rubric._count.assignments > 0) {
    return c.json({ error: `Rubrik ini sedang digunakan oleh ${rubric._count.assignments} tugas. Tidak dapat dihapus.` }, 400);
  }

  await prisma.rubric.delete({ where: { id: rubricId } });
  return c.json({ success: true, message: "Rubrik berhasil dihapus" });
});

rubricsRouter.put("/:rubricId", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Forbidden" }, 403);

  const classId = c.req.param("classId") as string;
  const rubricId = c.req.param("rubricId") as string;

  const existing = await prisma.rubric.findFirst({ where: { id: rubricId, classId } });
  if (!existing) return c.json({ error: "Rubrik tidak ditemukan" }, 404);

  const body = await c.req.json();
  const parsed = createRubricSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Data rubrik tidak valid" }, 400);

  const { title, criteria } = parsed.data;

  const criteriaWithEmbeddings = await Promise.all(
    criteria.map(async (cr) => {
      let answerKeyEmbedding: number[] | undefined;
      let materialEmbedding: number[] | undefined;

      if (cr.answerKey && cr.answerKey.trim()) {
        try {
          const result = await generateEmbedding(cr.answerKey);
          answerKeyEmbedding = result.embedding;
        } catch (err) {
          console.warn("[Rubric API] Gagal embed kunci jawaban:", err);
        }
      }

      if (cr.material && cr.material.trim()) {
        try {
          const result = await generateEmbedding(cr.material);
          materialEmbedding = result.embedding;
        } catch (err) {
          console.warn("[Rubric API] Gagal embed materi:", err);
        }
      }

      return {
        label: cr.label,
        description: cr.description || null,
        expectedAnswer: cr.expectedAnswer || null,
        answerKey: cr.answerKey || null,
        material: cr.material || null,
        answerKeyEmbedding: answerKeyEmbedding ?? undefined,
        materialEmbedding: materialEmbedding ?? undefined,
        maxScore: cr.maxScore,
        weight: cr.weight,
      };
    }),
  );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.rubricCriterion.deleteMany({ where: { rubricId } });
    return tx.rubric.update({
      where: { id: rubricId },
      data: {
        title,
        criteria: { create: criteriaWithEmbeddings },
      },
      include: { criteria: true },
    });
  });

  return c.json(updated);
});

export default rubricsRouter;
