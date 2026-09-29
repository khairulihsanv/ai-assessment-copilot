import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { extractTextFromBuffer } from "@/lib/ai/extract-text";

// Limit file size to 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal 10MB." },
        { status: 400 }
      );
    }

    // Determine file type from name or mime type
    let fileType: "PDF" | "DOCX" | null = null;
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      fileType = "PDF";
    } else if (
      fileName.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      fileType = "DOCX";
    }

    if (!fileType) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Harap unggah PDF atau DOCX." },
        { status: 400 }
      );
    }

    // Read file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const text = await extractTextFromBuffer(buffer, fileType);

    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error("Error extracting text:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengekstrak teks dari file." },
      { status: 500 }
    );
  }
}
