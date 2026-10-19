import { describe, expect, it } from "vitest";
import {
  averageDailyExpense,
  budgetStatus,
  computeTotals,
  highestSpendingDay,
  monthsUntil,
  monthlySavingsTarget,
  newlyCrossedThresholds,
  percentChange,
  savingsIfReduced,
  savingsRate,
  suggestedMonthlyContribution,
  totalsFromSummary,
} from "@/lib/finance/calculations";

const tx = (type: "income" | "expense" | "transfer", amount: number, isRefund = false) => ({
  transaction_type: type,
  amount,
  is_refund: isRefund,
});

describe("computeTotals (accounting model)", () => {
  it("counts income and expenses, excludes transfers", () => {
    const t = computeTotals([tx("income", 50000), tx("expense", 1200), tx("transfer", 10000)]);
    expect(t.income.toNumber()).toBe(50000);
    expect(t.netExpense.toNumber()).toBe(1200);
    expect(t.transfers.toNumber()).toBe(10000);
    expect(t.netCashFlow.toNumber()).toBe(48800);
  });

  it("refunds reduce spending and never count as income", () => {
    const t = computeTotals([tx("expense", 1000), tx("expense", 300, true)]);
    expect(t.grossExpense.toNumber()).toBe(1000);
    expect(t.refunds.toNumber()).toBe(300);
    expect(t.netExpense.toNumber()).toBe(700);
    expect(t.income.toNumber()).toBe(0);
  });

  it("does not double count credit card repayments (transfers)", () => {
    // Purchase on credit card = expense; repayment bank -> card = transfer.
    const t = computeTotals([tx("expense", 5000), tx("transfer", 5000)]);
    expect(t.netExpense.toNumber()).toBe(5000);
    expect(t.netCashFlow.toNumber()).toBe(-5000);
  });

  it("savings contributions (transfers) are not spending", () => {
    const t = computeTotals([tx("income", 10000), tx("transfer", 4000)]);
    expect(t.netExpense.toNumber()).toBe(0);
    expect(t.netCashFlow.toNumber()).toBe(10000);
  });

  it("maps SQL summary rows", () => {
    const t = totalsFromSummary({ total_income: 100, gross_expense: 60, total_refund: 10, net_expense: 50, total_transfers: 0, transaction_count: 3 });
    expect(t.netCashFlow.toNumber()).toBe(50);
    expect(totalsFromSummary(null).income.toNumber()).toBe(0);
  });
});

describe("savingsRate", () => {
  it("computes (income - expense) / income", () => {
    expect(savingsRate(50000, 30000)).toBe(40);
    expect(savingsRate(1000, 1250)).toBe(-25);
  });
  it("returns null when income is zero or missing", () => {
    expect(savingsRate(0, 500)).toBeNull();
    expect(savingsRate(-10, 0)).toBeNull();
  });
});

describe("budgetStatus", () => {
  it("matches the spec example (₹8,000 budget, ₹6,500 spent)", () => {
    const s = budgetStatus(6500, 8000, [80, 100]);
    expect(s.remaining.toNumber()).toBe(1500);
    expect(s.percentUsed).toBe(81.25);
    expect(s.state).toBe("warning");
    expect(s.crossedThresholds).toEqual([80]);
  });
  it("is over budget at 100%", () => {
    const s = budgetStatus(8000, 8000);
    expect(s.state).toBe("over");
    expect(s.crossedThresholds).toEqual([80, 100]);
    expect(s.remaining.toNumber()).toBe(0);
  });
  it("is ok below thresholds and handles zero limit", () => {
    expect(budgetStatus(100, 8000).state).toBe("ok");
    expect(budgetStatus(100, 0).percentUsed).toBe(0);
  });
  it("respects custom thresholds", () => {
    expect(budgetStatus(5000, 10000, [50, 90]).state).toBe("warning");
    expect(budgetStatus(4999, 10000, [50, 90]).state).toBe("ok");
  });
});

describe("newlyCrossedThresholds", () => {
  it("only reports thresholds not alerted before", () => {
    expect(newlyCrossedThresholds(85, [80, 100], [])).toEqual([80]);
    expect(newlyCrossedThresholds(105, [80, 100], [80])).toEqual([100]);
    expect(newlyCrossedThresholds(105, [80, 100], [80, 100])).toEqual([]);
  });
});

describe("period metrics", () => {
  it("averages daily expense", () => {
    expect(averageDailyExpense(3100, 31).toNumber()).toBe(100);
    expect(averageDailyExpense(100, 0).toNumber()).toBe(0);
    expect(averageDailyExpense(10, 3).toNumber()).toBe(3.33);
  });
  it("finds the highest spending day", () => {
    const rows = [
      { day: "2026-10-01", income: 0, expense: 100 },
      { day: "2026-10-02", income: 0, expense: 950.5 },
      { day: "2026-10-03", income: 0, expense: 20 },
    ];
    expect(highestSpendingDay(rows)?.day).toBe("2026-10-02");
    expect(highestSpendingDay([])).toBeNull();
    expect(highestSpendingDay([{ day: "2026-10-01", income: 10, expense: 0 }])).toBeNull();
  });
  it("percent change is null when previous is zero", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("savings planner helpers", () => {
  it("months until target counts current month", () => {
    expect(monthsUntil("2026-12-15", "2026-10-19")).toBe(3);
    expect(monthsUntil("2026-10-25", "2026-10-19")).toBe(1);
    expect(monthsUntil("2025-01-01", "2026-10-19")).toBe(1);
    expect(monthsUntil(null, "2026-10-19")).toBeNull();
  });
  it("suggests monthly contributions", () => {
    expect(suggestedMonthlyContribution(120000, 20000, 10)?.toNumber()).toBe(10000);
    expect(suggestedMonthlyContribution(1000, 1000, 5)?.toNumber()).toBe(0);
    expect(suggestedMonthlyContribution(1000, 0, null)).toBeNull();
  });
  it("estimates savings if a category is reduced", () => {
    expect(savingsIfReduced(8000, 25).toNumber()).toBe(2000);
    expect(savingsIfReduced(8000, 150).toNumber()).toBe(8000);
    expect(savingsIfReduced(8000, -5).toNumber()).toBe(0);
  });
  it("computes monthly target from fixed or percent settings", () => {
    expect(monthlySavingsTarget("fixed", 5000, 0)?.toNumber()).toBe(5000);
    expect(monthlySavingsTarget("percent", 20, 50000)?.toNumber()).toBe(10000);
    expect(monthlySavingsTarget("percent", 20, 0)).toBeNull();
    expect(monthlySavingsTarget(null, null, 50000)).toBeNull();
  });
});
