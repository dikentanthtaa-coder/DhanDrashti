import { z } from "zod";
import { categoryTypeSchema, hexColorSchema, uuidSchema } from "@/lib/validation/common";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(60),
  type: categoryTypeSchema,
  parentId: uuidSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
  icon: z.string().trim().max(40).nullable().optional().transform((v) => (v ? v : null)),
  color: hexColorSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
});

export const reorderCategoriesSchema = z.object({
  orderedIds: z.array(uuidSchema).min(1).max(500),
});

export type CategoryInput = z.input<typeof categorySchema>;
