import { z } from "zod";
import { isValidDateString } from "@/lib/finance/dates";
import { parseAmountInput } from "@/lib/finance/money";

export const uuidSchema = z.uuid({ message: "Invalid identifier" });

export const dateStringSchema = z
  .string()
  .refine((s) => isValidDateString(s), { message: "Enter a valid date" });

/** Positive money amount with at most 2 decimals, accepts "1,25,000.50" style input. */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const d = typeof v === "number" ? parseAmountInput(String(v)) : parseAmountInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount (up to 2 decimals)" });
      return z.NEVER;
    }
    if (d.lte(0)) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
      return z.NEVER;
    }
    if (d.gte(1_000_000_000_000)) {
      ctx.addIssue({ code: "custom", message: "Amount is too large" });
      return z.NEVER;
    }
    return d.toFixed(2);
  });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const paymentMethodSchema = z.enum([
  "cash",
  "upi",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "wallet",
  "other",
]);

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export const categoryTypeSchema = z.enum(["income", "expense"]);
export const accountTypeSchema = z.enum(["cash", "bank", "savings", "credit_card", "other"]);
export const frequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour");
