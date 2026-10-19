import { z } from "zod";
import {
  amountSchema,
  dateStringSchema,
  optionalText,
  paymentMethodSchema,
  transactionTypeSchema,
  uuidSchema,
} from "@/lib/validation/common";

export const transactionSchema = z
  .object({
    transactionType: transactionTypeSchema,
    amount: amountSchema,
    transactionDate: dateStringSchema,
    accountId: uuidSchema,
    toAccountId: uuidSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    categoryId: uuidSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    paymentMethod: paymentMethodSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
    merchant: optionalText(120),
    note: optionalText(1000),
    isRefund: z.boolean().default(false),
    savingsGoalId: uuidSchema.optional().or(z.literal("")).transform((v) => (v ? v : null)),
  })
  .superRefine((d, ctx) => {
    if (d.transactionType === "transfer") {
      if (!d.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Choose the destination account" });
      if (d.toAccountId && d.toAccountId === d.accountId)
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Choose a different destination account" });
    } else {
      if (!d.categoryId) ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category" });
      if (d.transactionType === "income" && d.isRefund)
        ctx.addIssue({ code: "custom", path: ["isRefund"], message: "Refunds apply to expenses only" });
      if (d.savingsGoalId && d.transactionType === "expense")
        ctx.addIssue({ code: "custom", path: ["savingsGoalId"], message: "Only income or transfers can fund a goal" });
    }
  });

export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionValues = z.output<typeof transactionSchema>;

export const transactionFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(["income", "expense", "transfer", "refund"]).optional(),
  categoryId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  merchant: z.string().trim().max(120).optional(),
  start: dateStringSchema.optional(),
  end: dateStringSchema.optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
