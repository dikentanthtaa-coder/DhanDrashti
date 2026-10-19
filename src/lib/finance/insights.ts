import type { CategoryTotal } from "@/lib/types/database";
import { formatINR, money, percentOf } from "@/lib/finance/money";
import { percentChange, type Totals } from "@/lib/finance/calculations";

/** Build short, factual insight sentences. Returns [] when there is no data. */
export function buildInsights(input: {
  current: Totals;
  previous: Totals;
  topCategories: CategoryTotal[];
  overBudgets: { name: string; overBy: number }[];
  savingsRate: number | null;
  periodLabel: string;
}): string[] {
  const out: string[] = [];
  const { current, previous, topCategories } = input;

  if (current.netExpense.gt(0) && topCategories[0]) {
    const top = topCategories[0];
    out.push(`${top.category_name} is your top category at ${formatINR(top.total)} (${percentOf(top.total, current.netExpense).toFixed(0)}% of spending).`);
  }
  const change = percentChange(current.netExpense, previous.netExpense);
  if (change !== null && previous.netExpense.gt(0) && current.netExpense.gt(0)) {
    const dir = change > 0 ? "up" : "down";
    out.push(`Spending is ${dir} ${Math.abs(change).toFixed(0)}% vs ${input.periodLabel} (${formatINR(previous.netExpense)} → ${formatINR(current.netExpense)}).`);
  }
  for (const b of input.overBudgets.slice(0, 2)) {
    out.push(`${b.name} budget is over by ${formatINR(b.overBy)} this month.`);
  }
  if (input.savingsRate !== null && current.income.gt(0)) {
    if (input.savingsRate < 0) out.push(`You spent ${formatINR(current.netExpense.minus(current.income))} more than you earned in this period.`);
    else out.push(`You kept ${input.savingsRate.toFixed(0)}% of your income (${formatINR(current.netCashFlow)}) in this period.`);
  }
  if (current.refunds.gt(0)) out.push(`Refunds reduced your spending by ${formatINR(current.refunds)}.`);
  if (money(current.transfers).gt(0)) out.push(`${formatINR(current.transfers)} moved between your accounts (not counted as spending).`);
  return out.slice(0, 5);
}
