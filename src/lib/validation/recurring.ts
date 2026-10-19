import { z } from "zod";
import {
  amountSchema,
  dateStringSchema,
  frequencySchema,
  optionalText,
  paymentMethodSchema,
  transactionTypeSchema,
  uuidSchema,
} from "@/lib/validation/common";

export const recurringSchema = z
  .object({
    transactionType: transactionTypeSchema,
    amount: amountSchema,
    accountId: uuidSchema,
    toAccountId: uuidSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
    categoryId: uuidSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
    frequency: frequencySchema,
    startDate: dateStringSchema,
    nextDueDate: dateStringSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
    endDate: dateStringSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
    merchant: optionalText(120),
    note: optionalText(500),
    paymentMethod: paymentMethodSchema.optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
    postingMode: z.enum(["auto_post", "reminder"]).default("auto_post"),
  })
  .superRefine((d, ctx) => {
    if (d.transactionType === "transfer") {
      if (!d.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Choose the destination account" });
      if (d.toAccountId && d.toAccountId === d.accountId)
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Choose a different destination account" });
    } else if (!d.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category" });
    }
    if (d.endDate && d.endDate < d.startDate)
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
    if (d.nextDueDate && d.nextDueDate < d.startDate)
      ctx.addIssue({ code: "custom", path: ["nextDueDate"], message: "Next due date cannot be before the start date" });
  });

export type RecurringInput = z.input<typeof recurringSchema>;
