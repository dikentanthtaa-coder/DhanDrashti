import Decimal from "decimal.js";
import { money, percentOf, round2, sum } from "@/lib/finance/money";
import type { DailyTotal, MonthlyTotal, PeriodSummary, TransactionRow } from "@/lib/types/database";

/**
 * Accounting model (single source of truth, mirrored by SQL functions):
 *  - income: counts toward income
 *  - expense (is_refund=false): counts toward spending
 *  - expense (is_refund=true): reduces spending in its category
 *  - transfer: moves money between the user's own accounts, never income/expense
 */

export interface Totals {
  income: Decimal;
  grossExpense: Decimal;
  refunds: Decimal;
  netExpense: Decimal;
  transfers: Decimal;
  netCashFlow: Decimal;
}

export function computeTotals(transactions: Pick<TransactionRow, "transaction_type" | "amount" | "is_refund">[]): Totals {
  let income = new Decimal(0);
  let grossExpense = new Decimal(0);
  let refunds = new Decimal(0);
  let transfers = new Decimal(0);
  for (const t of transactions) {
    const amt = money(t.amount);
    if (t.transaction_type === "income") income = income.plus(amt);
    else if (t.transaction_type === "expense") {
      if (t.is_refund) refunds = refunds.plus(amt);
      else grossExpense = grossExpense.plus(amt);
    } else if (t.transaction_type === "transfer") transfers = transfers.plus(amt);
  }
  const netExpense = grossExpense.minus(refunds);
  return {
    income,
    grossExpense,
    refunds,
    netExpense,
    transfers,
    netCashFlow: income.minus(netExpense),
  };
}

export function totalsFromSummary(s: PeriodSummary | null | undefined): Totals {
  const income = money(s?.total_income);
  const grossExpense = money(s?.gross_expense);
  const refunds = money(s?.total_refund);
  const netExpense = money(s?.net_expense);
  return {
    income,
    grossExpense,
    refunds,
    netExpense,
    transfers: money(s?.total_transfers),
    netCashFlow: income.minus(netExpense),
  };
}

/**
 * Savings rate = (income - net expenses) / income, as a percentage.
 * Returns null when income is zero/negative so the UI never shows a misleading value.
 */
export function savingsRate(income: Decimal | number, netExpense: Decimal | number): number | null {
  const inc = money(income);
  if (inc.lte(0)) return null;
  return round2(inc.minus(money(netExpense)).div(inc).times(100)).toNumber();
}

export type BudgetState = "ok" | "warning" | "over";

export interface BudgetStatus {
  spent: Decimal;
  limit: Decimal;
  remaining: Decimal;
  percentUsed: number;
  state: BudgetState;
  crossedThresholds: number[];
}

/** Budget status for a limit/spent pair with configurable thresholds. */
export function budgetStatus(spent: Decimal | number, limit: Decimal | number, thresholds: number[] = [80, 100]): BudgetStatus {
  const s = money(spent);
  const l = money(limit);
  const percentUsed = percentOf(s, l);
  const sorted = [...thresholds].sort((a, b) => a - b);
  const crossed = sorted.filter((t) => percentUsed >= t);
  const warnLevel = sorted.filter((t) => t < 100);
  let state: BudgetState = "ok";
  if (percentUsed >= 100) state = "over";
  else if (warnLevel.some((t) => percentUsed >= t)) state = "warning";
  return { spent: s, limit: l, remaining: l.minus(s), percentUsed, state, crossedThresholds: crossed };
}

/** Which thresholds are newly crossed given previously alerted ones. */
export function newlyCrossedThresholds(percentUsed: number, thresholds: number[], alreadyAlerted: number[]): number[] {
  return thresholds.filter((t) => percentUsed >= t && !alreadyAlerted.includes(t)).sort((a, b) => a - b);
}

export function averageDailyExpense(netExpense: Decimal | number, days: number): Decimal {
  if (days <= 0) return new Decimal(0);
  return round2(money(netExpense).div(days));
}

export function highestSpendingDay(daily: DailyTotal[]): DailyTotal | null {
  let best: DailyTotal | null = null;
  for (const d of daily) {
    if (!best || money(d.expense).gt(money(best.expense))) best = d;
  }
  return best && money(best.expense).gt(0) ? best : null;
}

/** Percent change from previous to current. null when previous is 0 (undefined change). */
export function percentChange(current: Decimal | number, previous: Decimal | number): number | null {
  const p = money(previous);
  if (p.isZero()) return null;
  return round2(money(current).minus(p).div(p.abs()).times(100)).toNumber();
}

/** Monthly savings (income - net expense) per month. */
export function monthlySavings(rows: MonthlyTotal[]): { month: string; income: Decimal; expense: Decimal; savings: Decimal }[] {
  return rows.map((r) => {
    const income = money(r.income);
    const expense = money(r.expense);
    return { month: r.month, income, expense, savings: income.minus(expense) };
  });
}

/** Months remaining until target date (minimum 1), counting the current month. */
export function monthsUntil(targetDate: string | null, today: string): number | null {
  if (!targetDate) return null;
  const [ty, tm] = targetDate.split("-").map(Number);
  const [cy, cm] = today.split("-").map(Number);
  const diff = (ty - cy) * 12 + (tm - cm);
  return Math.max(1, diff + (targetDate >= today ? 1 : 0));
}

/** Suggested monthly contribution to hit a goal by its target date. */
export function suggestedMonthlyContribution(target: Decimal | number, saved: Decimal | number, monthsLeft: number | null): Decimal | null {
  const remaining = money(target).minus(money(saved));
  if (remaining.lte(0)) return new Decimal(0);
  if (!monthsLeft || monthsLeft <= 0) return null;
  return round2(remaining.div(monthsLeft));
}

/** Possible saving if spend in a category is cut by `percent`. */
export function savingsIfReduced(categorySpend: Decimal | number, percent: number): Decimal {
  const p = Math.min(100, Math.max(0, percent));
  return round2(money(categorySpend).times(p).div(100));
}

/** Monthly savings target as an amount, from fixed or percent-of-income settings. */
export function monthlySavingsTarget(
  type: "fixed" | "percent" | null,
  value: number | null,
  monthlyIncome: Decimal | number
): Decimal | null {
  if (!type || value === null || value === undefined) return null;
  if (type === "fixed") return round2(value);
  const inc = money(monthlyIncome);
  if (inc.lte(0)) return null;
  return round2(inc.times(value).div(100));
}

export function sumAmounts(values: (number | string | Decimal)[]): Decimal {
  return sum(values);
}
