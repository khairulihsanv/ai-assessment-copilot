import { Hono } from "hono";
import { extractTextFromBuffer } from "../ai/extract-text.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";

const aiRouter = new Hono<AuthContext>();
aiRouter.use("*", internalAuthMiddleware);

aiRouter.post("/extract-text", async (c) => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "Invalid content type" }, 400);
  }

  const formData = await c.req.parseBody();
  const file = formData.file as File | undefined;

  if (!file) return c.json({ error: "File tidak ditemukan" }, 400);
  if (file.size > MAX_FILE_SIZE) return c.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, 400);

  let fileType: "PDF" | "DOCX" | null = null;
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
    fileType = "PDF";
  } else if (fileName.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    fileType = "DOCX";
  }

  if (!fileType) return c.json({ error: "Tipe file tidak didukung. Harap unggah PDF atau DOCX." }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const text = await extractTextFromBuffer(buffer, fileType);
    return c.json({ success: true, text });
  } catch (error) {
    console.error("Error extracting text:", error);
    return c.json({ error: error instanceof Error ? error.message : "Gagal mengekstrak teks dari file." }, 500);
  }
});

export default aiRouter;
