import { Hono } from "hono";
import { prisma } from "../db/prisma.js";
import { internalAuthMiddleware, AuthContext } from "../middleware/auth.js";
import { publicGradeSelect, withReleasedGrade } from "../utils/public-selects.js";
import { getStorage } from "../storage/storage.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const submissionsRouter = new Hono<AuthContext>();
submissionsRouter.use("*", internalAuthMiddleware);

// Attached under /classes/:classId/assignments/:assignmentId/submissions
submissionsRouter.get("/", async (c) => {
  const user = c.get("user");
  const classId = c.req.param("classId") as string;
  const assignmentId = c.req.param("assignmentId") as string;

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    include: { class: { include: { enrollments: { where: { userId: user.id } } } } },
  });

  if (!assignment) return c.json({ error: "Tugas tidak ditemukan" }, 404);

  const isDosen = assignment.class.dosenId === user.id;
  const enrollment = assignment.class.enrollments[0];
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) return c.json({ error: "Akses ditolak" }, 403);
  if (!isPrivileged && assignment.status === "DRAFT") return c.json({ error: "Tugas tidak ditemukan" }, 404);

  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId,
      ...(isPrivileged ? {} : { userId: user.id }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      grades: isPrivileged ? true : { where: { status: "RELEASED" }, select: publicGradeSelect },
      evaluations: isPrivileged,
      versions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(isPrivileged ? submissions : submissions.map(withReleasedGrade));
});

submissionsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "MAHASISWA") return c.json({ error: "Hanya mahasiswa yang dapat mengumpulkan tugas" }, 403);

  const classId = c.req.param("classId") as string;
  const assignmentId = c.req.param("assignmentId") as string;

  const enrollment = await prisma.enrollment.findUnique({
    where: { classId_userId: { classId, userId: user.id } },
  });

  if (!enrollment || enrollment.role !== "STUDENT") return c.json({ error: "Anda belum terdaftar di kelas ini" }, 403);

  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, classId } });
  if (!assignment) return c.json({ error: "Tugas tidak ditemukan" }, 404);
  if (assignment.status !== "PUBLISHED") return c.json({ error: "Tugas tidak menerima pengumpulan" }, 403);

  const now = new Date();
  if (now > assignment.dueDate && !assignment.allowLateSubmission) {
    return c.json({ error: "Tenggat waktu pengumpulan tugas ini telah berakhir" }, 400);
  }

  const contentType = c.req.header("content-type") || "";
  let submissionType: "TEXT" | "PDF" | "DOCX";
  let content: string | null = null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.parseBody();
      const file = formData["file"] as File | undefined;
      const text = formData["content"] as string | undefined;

      if (file && file.size > 0) {
        if (file.size > MAX_FILE_SIZE) {
          return c.json({ error: "Ukuran file melebihi batas maksimum 10MB" }, 400);
        }

        const originalName = file.name.toLowerCase();
        if (originalName.endsWith(".pdf")) submissionType = "PDF";
        else if (originalName.endsWith(".docx")) submissionType = "DOCX";
        else return c.json({ error: "Format file tidak didukung. Harap unggah file .pdf atau .docx" }, 400);

        if (assignment.submissionType !== "ANY" && assignment.submissionType !== submissionType) {
          return c.json({ error: `Tugas ini hanya menerima format ${assignment.submissionType}` }, 400);
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const storage = getStorage();
        const savedFileName = await storage.save(file.name, buffer);

        fileUrl = savedFileName;
        fileName = file.name;
      } else if (text && text.trim()) {
        if (assignment.submissionType !== "ANY" && assignment.submissionType !== "TEXT") {
          return c.json({ error: `Tugas ini hanya menerima format ${assignment.submissionType}` }, 400);
        }
        submissionType = "TEXT";
        content = text.trim();
      } else {
        return c.json({ error: "File atau teks jawaban tidak boleh kosong" }, 400);
      }
    } else {
      const body = await c.req.json();
      if (typeof body.content !== "string" || !body.content.trim()) {
        return c.json({ error: "Teks jawaban tidak boleh kosong" }, 400);
      }
      if (assignment.submissionType !== "ANY" && assignment.submissionType !== "TEXT") {
        return c.json({ error: `Tugas ini hanya menerima format ${assignment.submissionType}` }, 400);
      }
      submissionType = "TEXT";
      content = body.content.trim();
    }

    const submission = await prisma.submission.findUnique({
      where: { assignmentId_userId: { assignmentId, userId: user.id } },
      include: { versions: true },
    });

    const nextVersionNumber = submission ? submission.versions.length + 1 : 1;

    const result = await prisma.$transaction(async (tx) => {
      let subId = submission?.id;
      if (!subId) {
        const newSub = await tx.submission.create({
          data: { assignmentId, userId: user.id },
        });
        subId = newSub.id;
      }

      const newVersion = await tx.submissionVersion.create({
        data: {
          submissionId: subId,
          versionNumber: nextVersionNumber,
          type: submissionType,
          content,
          fileUrl,
          fileName,
        },
      });

      return tx.submission.update({
        where: { id: subId },
        data: { activeVersionId: newVersion.id },
        include: { versions: true },
      });
    });

    return c.json(result, 201);
  } catch (error) {
    console.error("Submission upload error:", error);
    return c.json({ error: "Gagal menyimpan pengumpulan tugas" }, 500);
  }
});

export default submissionsRouter;
