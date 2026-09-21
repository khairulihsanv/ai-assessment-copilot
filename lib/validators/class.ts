import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().min(3, "Nama kelas minimal 3 karakter").max(100),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter").optional(),
  subject: z.string().max(100, "Mata kuliah maksimal 100 karakter").optional(),
});

export const updateClassSchema = createClassSchema.partial();

export const joinClassSchema = z.object({
  enrollmentKey: z
    .string()
    .min(6, "Kode kelas minimal 6 karakter")
    .transform((val) => val.toUpperCase()),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type JoinClassInput = z.infer<typeof joinClassSchema>;
