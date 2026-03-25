import { z } from "zod";

export const adminCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().max(8).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const adminCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().max(8).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const adminSubcategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const adminSubcategoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export function formatZodError(err: z.ZodError): { message: string } {
  return {
    message: err.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
  };
}
