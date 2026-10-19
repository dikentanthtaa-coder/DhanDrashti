import { z } from "zod";
import { accountTypeSchema } from "@/lib/validation/common";
import { parseAmountInput } from "@/lib/finance/money";

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Enter an account name").max(60),
  accountType: accountTypeSchema,
  openingBalance: z
    .union([z.string(), z.number()])
    .default("0")
    .transform((v, ctx) => {
      const raw = String(v).trim() === "" ? "0" : String(v);
      const d = parseAmountInput(raw);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
        return z.NEVER;
      }
      if (d.abs().gte(1_000_000_000_000)) {
        ctx.addIssue({ code: "custom", message: "Amount is too large" });
        return z.NEVER;
      }
      return d.toFixed(2);
    }),
  isActive: z.boolean().default(true),
});

export type AccountInput = z.input<typeof accountSchema>;
