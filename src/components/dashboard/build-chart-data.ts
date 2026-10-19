import type { BudgetUsage, CategoryTotal, DailyTotal, MonthlyTotal, PaymentMethodTotal } from "@/lib/types/database";
import { eachDayInRange, formatDisplayDate, formatMonthLabel, type DateRange } from "@/lib/finance/dates";
import { budgetStatus, monthlySavings } from "@/lib/finance/calculations";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { DashboardChartData } from "@/components/dashboard/dashboard-charts";

/** Pure transformation of RPC results into serialisable chart props. */
export function buildChartData(input: {
  range: DateRange;
  daily: DailyTotal[];
  monthly: MonthlyTotal[];
  sixMonths: MonthlyTotal[];
  currentMonth: string;
  categories: CategoryTotal[];
  budgets: BudgetUsage[];
  methods: PaymentMethodTotal[];
  rangeLabel: string;
}): DashboardChartData {
  const dayMap = new Map(input.daily.map((d) => [d.day, d]));
  const days = eachDayInRange(input.range);
  const trend = days.map((day) => ({ day, expense: Number(dayMap.get(day)?.expense ?? 0) }));

  const useMonths = days.length > 62;
  const incomeExpense = useMonths
    ? input.monthly.map((m) => ({ label: formatMonthLabel(m.month), income: Number(m.income), expense: Number(m.expense) }))
    : days.map((day) => {
        const d = dayMap.get(day);
        return { label: formatDisplayDate(day, "d MMM"), income: Number(d?.income ?? 0), expense: Number(d?.expense ?? 0) };
      });

  const pie = input.categories.map((c) => ({ id: c.category_id, name: c.category_name, value: Number(c.total), color: c.color }));

  const sixMap = new Map(input.sixMonths.map((m) => [m.month, m]));
  const months: string[] = [];
  const [y, mo] = input.currentMonth.split("-").map(Number);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, mo - 1 - i, 1));
    months.push(d.toISOString().slice(0, 10));
  }
  const monthly = months.map((m) => ({
    month: m,
    label: formatMonthLabel(m),
    expense: Number(sixMap.get(m)?.expense ?? 0),
    current: m === input.currentMonth,
  }));

  const savings = monthlySavings(months.map((m) => sixMap.get(m) ?? { month: m, income: 0, expense: 0, refunds: 0 })).map((s) => ({
    label: formatMonthLabel(s.month),
    income: s.income.toNumber(),
    expense: s.expense.toNumber(),
    savings: s.savings.toNumber(),
  }));

  const budgets = input.budgets.map((b) => {
    const s = budgetStatus(b.spent, b.amount_limit, b.alert_thresholds);
    return {
      id: b.budget_id,
      label: b.category_name ?? "Overall",
      spent: Number(b.spent),
      limit: Number(b.amount_limit),
      percent: s.percentUsed,
      state: s.state,
    };
  });

  const methods = input.methods.map((m) => ({ label: PAYMENT_METHOD_LABELS[m.payment_method] ?? m.payment_method, total: Number(m.total) }));

  return { trend, incomeExpense, incomeExpenseGranularity: useMonths ? "month" : "day", pie, monthly, budgets, savings, methods, rangeLabel: input.rangeLabel };
}
