import { z } from "zod";

export const createAssignmentSchema = z.object({
  title: z.string().min(3, "Judul tugas minimal 3 karakter").max(200),
  instructions: z.string().min(10, "Instruksi tugas minimal 10 karakter"),
  submissionType: z.enum(["TEXT", "PDF", "DOCX", "ANY"]),
  dueDate: z.string().refine(
    (val) => new Date(val) > new Date(),
    "Deadline harus di masa depan"
  ),
  maxScore: z.number().min(1, "Skor maksimal minimal 1").max(1000).default(100),
  allowLateSubmission: z.boolean().default(false),
  rubricId: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
