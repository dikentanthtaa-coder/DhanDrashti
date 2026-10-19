import { z } from "zod";
import { amountSchema, dateStringSchema, optionalText, uuidSchema } from "@/lib/validation/common";

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1, "Enter a goal name").max(80),
  targetAmount: amountSchema,
  targetDate: dateStringSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
  description: optionalText(500),
  accountId: uuidSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
  status: z.enum(["active", "completed", "archived"]).default("active"),
});

export const contributionSchema = z.object({
  goalId: uuidSchema,
  amount: amountSchema,
  transactionDate: dateStringSchema,
  fromAccountId: uuidSchema,
  toAccountId: uuidSchema,
  note: optionalText(500),
});

export const savingsTargetSchema = z.object({
  type: z.enum(["fixed", "percent", "none"]),
  value: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || String(v).trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 1_000_000_000), "Enter a valid value"),
});

export type SavingsGoalInput = z.input<typeof savingsGoalSchema>;
