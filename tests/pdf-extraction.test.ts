import { describe, expect, it } from "vitest";
import { extractTextFromBuffer } from "@/lib/ai/extract-text";

// A real, single-page PDF with an xref table; the parser is not mocked.
function samplePdf(): Buffer {
  const stream = "BT /F1 12 Tf 72 720 Td (Dexa assessment reference) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => {
    const offset = Buffer.byteLength(pdf);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

describe("PDF extraction with the installed pdf-parse runtime", () => {
  it("extracts text from a real PDF", async () => {
    expect(await extractTextFromBuffer(samplePdf(), "PDF")).toContain("Dexa assessment reference");
  });

  it("rejects corrupt input instead of producing reference text", async () => {
    await expect(extractTextFromBuffer(Buffer.from("not a PDF"), "PDF")).rejects.toThrow(
      "Gagal mengekstrak teks dari PDF",
    );
  });
});
