import { describe, expect, it } from "vitest";
import { transactionSchema, transactionFiltersSchema } from "@/lib/validation/transactions";
import { budgetSchema } from "@/lib/validation/budgets";
import { recurringSchema } from "@/lib/validation/recurring";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("transactionSchema", () => {
  it("accepts a valid expense and normalises the amount", () => {
    const r = transactionSchema.safeParse({ transactionType: "expense", amount: "1,250", transactionDate: "2026-10-19", accountId: A, categoryId: C });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amount).toBe("1250.00");
      expect(r.data.toAccountId).toBeNull();
      expect(r.data.merchant).toBeNull();
    }
  });
  it("requires a category for income/expense", () => {
    const r = transactionSchema.safeParse({ transactionType: "expense", amount: "10", transactionDate: "2026-10-19", accountId: A });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "categoryId")).toBe(true);
  });
  it("requires a different destination account for transfers", () => {
    expect(transactionSchema.safeParse({ transactionType: "transfer", amount: "10", transactionDate: "2026-10-19", accountId: A, toAccountId: A }).success).toBe(false);
    expect(transactionSchema.safeParse({ transactionType: "transfer", amount: "10", transactionDate: "2026-10-19", accountId: A, toAccountId: B }).success).toBe(true);
  });
  it("rejects zero/negative/invalid amounts and bad dates", () => {
    const base = { transactionType: "expense", transactionDate: "2026-10-19", accountId: A, categoryId: C };
    expect(transactionSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, amount: "-5" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, amount: "1.234" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, amount: "10", transactionDate: "2026-02-30" }).success).toBe(false);
  });
  it("refunds only on expenses", () => {
    expect(transactionSchema.safeParse({ transactionType: "income", amount: "10", transactionDate: "2026-10-19", accountId: A, categoryId: C, isRefund: true }).success).toBe(false);
  });
  it("parses filters with defaults", () => {
    const r = transactionFiltersSchema.parse({ page: "3", sort: "amount_desc" });
    expect(r.page).toBe(3);
    expect(r.sort).toBe("amount_desc");
    expect(transactionFiltersSchema.parse({}).page).toBe(1);
  });
});

describe("budgetSchema", () => {
  it("requires first-of-month dates and sorted unique thresholds", () => {
    const r = budgetSchema.safeParse({ amountLimit: "8000", periodStart: "2026-10-01", alertThresholds: [100, 80, 80] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.alertThresholds).toEqual([80, 100]);
    expect(budgetSchema.safeParse({ amountLimit: "8000", periodStart: "2026-10-05" }).success).toBe(false);
    expect(budgetSchema.safeParse({ amountLimit: "8000", periodStart: "2026-10-01", periodEnd: "2026-10-01" }).success).toBe(false);
  });
});

describe("recurringSchema", () => {
  it("validates date ordering and transfer shape", () => {
    const base = { transactionType: "expense", amount: "15000", accountId: A, categoryId: C, frequency: "monthly", startDate: "2026-01-31" };
    expect(recurringSchema.safeParse(base).success).toBe(true);
    expect(recurringSchema.safeParse({ ...base, endDate: "2025-12-01" }).success).toBe(false);
    expect(recurringSchema.safeParse({ ...base, transactionType: "transfer", categoryId: "", toAccountId: A }).success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("login requires email and password", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "A@Example.com", password: "secret" }).data?.email).toBe("a@example.com");
  });
  it("signup enforces password policy and confirmation", () => {
    const ok = signupSchema.safeParse({ displayName: "Asha", email: "asha@example.com", password: "paisa-track-2026", confirmPassword: "paisa-track-2026" });
    expect(ok.success).toBe(true);
    expect(signupSchema.safeParse({ displayName: "Asha", email: "asha@example.com", password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ displayName: "Asha", email: "asha@example.com", password: "onlyletterslong", confirmPassword: "onlyletterslong" }).success).toBe(false);
    const mismatch = signupSchema.safeParse({ displayName: "Asha", email: "asha@example.com", password: "paisa-track-2026", confirmPassword: "different-2026" });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) expect(mismatch.error.issues[0].path).toEqual(["confirmPassword"]);
  });
});
