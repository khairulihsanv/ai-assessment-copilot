import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { createClassSchema, joinClassSchema, updateClassSchema } from "@dexa/contracts";
import { internalAuthMiddleware, type AuthContext } from "../middleware/auth.js";
import { publicGradeSelect, withReleasedGrade } from "../utils/public-selects.js";

const classesRouter = new Hono<AuthContext>();

classesRouter.use("*", internalAuthMiddleware);

classesRouter.get("/", async (c) => {
  const user = c.get("user");
  const isDosen = user.role === "DOSEN";

  const classes = isDosen
    ? await prisma.class.findMany({
        where: { dosenId: user.id },
        include: {
          _count: { select: { enrollments: true, assignments: true } },
          dosen: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.class.findMany({
        where: { enrollments: { some: { userId: user.id } } },
        include: {
          _count: { select: { enrollments: true, assignments: true } },
          dosen: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

  const sanitized = isDosen
    ? classes
    : classes.map(({ enrollmentKey: _, ...rest }) => rest);

  return c.json(sanitized);
});

classesRouter.post("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, 400);
  }

  const enrollmentKey = Array.from({ length: 6 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
  ).join("");

  const newClass = await prisma.class.create({
    data: {
      ...parsed.data,
      dosenId: user.id,
      enrollmentKey,
    },
  });

  return c.json(newClass, 201);
});

classesRouter.post("/join", async (c) => {
  const user = c.get("user");
  if (user.role !== "MAHASISWA") {
    return c.json({ error: "Hanya mahasiswa yang dapat bergabung ke kelas" }, 401);
  }

  const body = await c.req.json();
  const parsed = joinClassSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Kode kelas tidak valid" }, 400);
  }

  const enrollmentKey = parsed.data.enrollmentKey.trim().toUpperCase();

  const cls = await prisma.class.findUnique({
    where: { enrollmentKey },
  });

  if (!cls) {
    return c.json({ error: "Kode kelas tidak ditemukan. Pastikan kode yang Anda masukkan benar." }, 404);
  }

  if (cls.isArchived) {
    return c.json({ error: "Kelas ini sudah diarsipkan oleh dosen pengajar." }, 400);
  }

  const existing = await prisma.enrollment.findUnique({
    where: { classId_userId: { classId: cls.id, userId: user.id } },
  });

  if (existing) {
    return c.json({ error: "Anda sudah terdaftar di kelas ini." }, 400);
  }

  await prisma.enrollment.create({
    data: { classId: cls.id, userId: user.id },
  });

  return c.json({ success: true, classId: cls.id, className: cls.name }, 201);
});


classesRouter.get("/:classId", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId");

  const baseCls = await prisma.class.findUnique({
    where: { id: classId },
    select: { dosenId: true },
  });

  if (!baseCls) return c.json({ error: "Kelas tidak ditemukan" }, 404);

  const isDosen = user.role === "DOSEN" && baseCls.dosenId === user.id;
  const enrollment = await prisma.enrollment.findUnique({
    where: { classId_userId: { classId, userId: user.id } },
  });

  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) return c.json({ error: "Akses ditolak" }, 403);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      enrollmentKey: isPrivileged,
      isArchived: true,
      createdAt: true,
      dosenId: true,
      dosen: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
        orderBy: { joinedAt: "asc" },
      },
      assignments: {
        where: isPrivileged ? {} : { status: { not: "DRAFT" } },
        include: {
          submissions: {
            where: isPrivileged ? {} : { userId: user.id },
            include: {
              grades: isPrivileged
                ? true
                : { where: { status: "RELEASED" }, select: publicGradeSelect },
              versions: true,
            },
          },
          rubric: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { dueDate: "asc" },
      },
      rubrics: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          classId: true,
          createdById: true,
          _count: { select: { assignments: true } },
          criteria: {
            select: {
              id: true,
              label: true,
              description: true,
              maxScore: true,
              weight: true,
              expectedAnswer: isPrivileged,
              rubricId: true,
              answerKey: isPrivileged,
              material: isPrivileged,
              answerKeyEmbedding: isPrivileged,
              materialEmbedding: isPrivileged,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { enrollments: true, assignments: true } },
    },
  });

  if (!cls) return c.json({ error: "Kelas tidak ditemukan" }, 404);

  return c.json(
    isPrivileged
      ? cls
      : {
          ...cls,
          assignments: cls.assignments.map((assignment) => ({
            ...assignment,
            submissions: assignment.submissions.map(withReleasedGrade),
          })),
        }
  );
});

classesRouter.patch("/:classId", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Unauthorized" }, 401);

  const classId = c.req.param("classId");
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  
  if (!cls || cls.dosenId !== user.id) return c.json({ error: "Kelas tidak ditemukan" }, 404);

  const body = await c.req.json();
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, 400);

  const updated = await prisma.class.update({
    where: { id: classId },
    data: parsed.data,
  });

  return c.json(updated);
});

classesRouter.delete("/:classId", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Unauthorized" }, 401);

  const classId = c.req.param("classId");
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  
  if (!cls || cls.dosenId !== user.id) return c.json({ error: "Kelas tidak ditemukan" }, 404);

  await prisma.class.delete({ where: { id: classId } });
  return c.json({ success: true });
});

classesRouter.post("/:classId/regenerate-key", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") return c.json({ error: "Unauthorized" }, 401);

  const classId = c.req.param("classId");
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  
  if (!cls || cls.dosenId !== user.id) return c.json({ error: "Kelas tidak ditemukan" }, 404);

  const newKey = Array.from({ length: 6 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
  ).join("");

  const updated = await prisma.class.update({
    where: { id: classId },
    data: { enrollmentKey: newKey },
  });

  return c.json({ success: true, newKey: updated.enrollmentKey });
});

export default classesRouter;
