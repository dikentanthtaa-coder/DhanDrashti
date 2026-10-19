import { z } from "zod";
import { amountSchema, dateStringSchema, uuidSchema } from "@/lib/validation/common";

export const budgetSchema = z
  .object({
    categoryId: uuidSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    amountLimit: amountSchema,
    periodStart: dateStringSchema.refine((d) => d.endsWith("-01"), "Budgets start on the 1st of a month"),
    periodEnd: dateStringSchema
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null))
      .refine((d) => !d || d.endsWith("-01"), "End must be the 1st of a month"),
    alertThresholds: z
      .array(z.coerce.number().int().min(1).max(200))
      .max(5, "Up to 5 thresholds")
      .default([80, 100])
      .transform((arr) => Array.from(new Set(arr)).sort((a, b) => a - b)),
  })
  .refine((d) => !d.periodEnd || d.periodEnd > d.periodStart, {
    path: ["periodEnd"],
    message: "End month must be after the start month",
  });

export type BudgetInput = z.input<typeof budgetSchema>;
