import { z } from "zod";

const rubricCriterionSchema = z.object({
  id: z.string().optional(), // existing criterion ID for updates
  label: z.string().min(1, "Label kriteria wajib diisi").max(100),
  description: z.string().max(500).optional(),
  maxScore: z.number().min(0, "Skor maksimal tidak boleh negatif").max(1000),
  weight: z.number().min(0, "Bobot tidak boleh negatif").max(100, "Bobot maksimal 100%"),
  expectedAnswer: z.string().max(255).optional(), // Legacy: keyword matching
  answerKey: z.string().max(10000, "Kunci jawaban maksimal 10.000 karakter").optional(),
  material: z.string().max(20000, "Materi referensi maksimal 20.000 karakter").optional(),
});

export const createRubricSchema = z.object({
  title: z.string().min(3, "Judul rubrik minimal 3 karakter").max(100),
  criteria: z
    .array(rubricCriterionSchema)
    .min(1, "Rubrik harus memiliki minimal 1 kriteria")
    .refine(
      (criteria) => {
        const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
        return Math.abs(totalWeight - 100) < 0.01;
      },
      {
        message: "Total bobot semua kriteria harus = 100%",
      }
    ),
});

export const updateRubricSchema = createRubricSchema.partial();

export type RubricCriterionInput = z.infer<typeof rubricCriterionSchema>;
export type CreateRubricInput = z.infer<typeof createRubricSchema>;
export type UpdateRubricInput = z.infer<typeof updateRubricSchema>;
