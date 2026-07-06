import { z } from "zod";
import { AI_COMPLETABLE_FIELDS } from "@/lib/product-ai-fields";

export const adminProductAiCompleteSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(200)).min(1).max(40),
});

export const adminProductAiClearSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(200)).min(1).max(500),
  fields: z.array(z.enum(AI_COMPLETABLE_FIELDS)).optional(),
});

export type AdminProductAiCompleteInput = z.infer<typeof adminProductAiCompleteSchema>;
export type AdminProductAiClearInput = z.infer<typeof adminProductAiClearSchema>;
