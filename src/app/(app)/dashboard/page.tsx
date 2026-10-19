import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank, Scale, Target, Wallet, TrendingUp } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { todayInTimezone, previousRange, formatDisplayDate, monthStart, monthEnd, addMonthsToDateString } from "@/lib/finance/dates";
import { rangeFromSearchParams } from "@/lib/finance/range-params";
import { getCategoryTotals, getDailyTotals, getMonthlyTotals, getPaymentMethodTotals, getPeriodSummary, rollupToParents } from "@/lib/data/reports";
import { getBudgetUsage } from "@/lib/data/budgets";
import { getAccountBalances, listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { listRecentTransactions } from "@/lib/data/transactions";
import { listUpcomingRecurring } from "@/lib/data/recurring";
import { listUnreadNotifications } from "@/lib/data/notifications";
import { listSavingsGoals } from "@/lib/data/savings";
import { budgetStatus, percentChange, savingsRate, totalsFromSummary } from "@/lib/finance/calculations";
import { formatINR, money, percentOf, sum } from "@/lib/finance/money";
import { buildInsights } from "@/lib/finance/insights";
import { PageHeader } from "@/components/common/page-header";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { SummaryCard } from "@/components/common/summary-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { buildChartData } from "@/components/dashboard/build-chart-data";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { UpcomingRecurring } from "@/components/dashboard/upcoming-recurring";
import { BudgetAlertsWidget } from "@/components/dashboard/budget-alerts-widget";
import { SavingsGoalsWidget } from "@/components/dashboard/savings-goals-widget";
import { TopCategories } from "@/components/dashboard/top-categories";
import { Insights } from "@/components/dashboard/insights";
import { QuickAddExpense } from "@/components/transactions/quick-add-expense";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { profile, timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const { preset, range } = rangeFromSearchParams(params, today, "this_month");
  const prev = previousRange(range);
  const thisMonth = { start: monthStart(today), end: monthEnd(today) };
  const sixMonthsRange = { start: addMonthsToDateString(thisMonth.start, -5), end: thisMonth.end };

  const [
    todaySummary,
    rangeSummary,
    prevSummary,
    monthSummary,
    daily,
    monthlyInRange,
    sixMonths,
    categoryTotals,
    methods,
    budgets,
    balances,
    accounts,
    categories,
    recent,
    upcoming,
    unread,
    goals,
  ] = await Promise.all([
    getPeriodSummary({ start: today, end: today }),
    getPeriodSummary(range),
    getPeriodSummary(prev),
    getPeriodSummary(thisMonth),
    getDailyTotals(range),
    getMonthlyTotals(range),
    getMonthlyTotals(sixMonthsRange),
    getCategoryTotals(range, "expense"),
    getPaymentMethodTotals(range),
    getBudgetUsage(today),
    getAccountBalances(),
    listAccounts({ activeOnly: true }),
    listCategories(),
    listRecentTransactions(8),
    listUpcomingRecurring(today, 30, 6),
    listUnreadNotifications(5),
    listSavingsGoals(),
  ]);

  const todayT = totalsFromSummary(todaySummary);
  const cur = totalsFromSummary(rangeSummary);
  const prevT = totalsFromSummary(prevSummary);
  const monthT = totalsFromSummary(monthSummary);
  const parents = rollupToParents(categoryTotals);

  // Budget usage: prefer an overall budget; otherwise aggregate category budgets.
  const overall = budgets.find((b) => b.category_id === null);
  const budgetSpent = overall ? money(overall.spent) : sum(budgets.map((b) => b.spent));
  const budgetLimit = overall ? money(overall.amount_limit) : sum(budgets.map((b) => b.amount_limit));
  const budgetPct = budgets.length ? percentOf(budgetSpent, budgetLimit) : null;
  const budgetBasis = overall ? "Overall monthly budget" : budgets.length ? `Sum of ${budgets.length} category budget${budgets.length === 1 ? "" : "s"}` : "No budget set";

  const savingsBalance = sum(balances.filter((b) => b.account_type === "savings" && b.is_active).map((b) => b.balance));
  const rate = savingsRate(monthT.income, monthT.netExpense);

  const rangeLabel = `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
  const chartData = buildChartData({
    range,
    daily,
    monthly: monthlyInRange,
    sixMonths,
    currentMonth: thisMonth.start,
    categories: parents,
    budgets,
    methods,
    rangeLabel,
  });

  const overBudgets = budgets
    .map((b) => ({ b, s: budgetStatus(b.spent, b.amount_limit, b.alert_thresholds) }))
    .filter(({ s }) => s.state === "over")
    .map(({ b, s }) => ({ name: b.category_name ?? "Overall", overBy: s.spent.minus(s.limit).toNumber() }));
  const insights = buildInsights({
    current: cur,
    previous: prevT,
    topCategories: parents,
    overBudgets,
    savingsRate: savingsRate(cur.income, cur.netExpense),
    periodLabel: "the previous period",
  });

  const firstName = profile.display_name.split(" ")[0] || "there";
  const expenseDelta = { value: percentChange(cur.netExpense, prevT.netExpense), label: "vs previous period", invert: true };
  const incomeDelta = { value: percentChange(cur.income, prevT.income), label: "vs previous period" };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Hello, ${firstName} · ${formatDisplayDate(today, "EEEE, d MMMM yyyy")}`}
        actions={<QuickAddExpense accounts={accounts} categories={categories} today={today} />}
      />

      <div className="no-print">
        <DateRangeFilter preset={preset} range={range} today={today} />
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Today's expenses" value={formatINR(todayT.netExpense)} icon={ArrowDownRight} tone="expense" hint="Net of refunds" />
        <SummaryCard title="Today's income" value={formatINR(todayT.income)} icon={ArrowUpRight} tone="income" />
        <SummaryCard title="Expenses · selected period" value={formatINR(cur.netExpense)} icon={ArrowDownRight} tone="expense" delta={expenseDelta} hint={rangeLabel} />
        <SummaryCard title="Income · selected period" value={formatINR(cur.income)} icon={ArrowUpRight} tone="income" delta={incomeDelta} hint={rangeLabel} />
        <SummaryCard
          title="Net cash flow"
          value={formatINR(cur.netCashFlow)}
          icon={Scale}
          tone={cur.netCashFlow.isNegative() ? "critical" : "neutral"}
          hint="Income minus expenses (transfers excluded)"
        />
        <SummaryCard
          title="Budget usage · this month"
          value={budgetPct === null ? "—" : `${budgetPct.toFixed(1)}%`}
          icon={Target}
          tone={budgetPct === null ? "neutral" : budgetPct >= 100 ? "critical" : budgetPct >= 80 ? "warning" : "neutral"}
          hint={budgetBasis}
        />
        <SummaryCard
          title="Remaining monthly budget"
          value={budgets.length ? formatINR(budgetLimit.minus(budgetSpent)) : "—"}
          icon={Wallet}
          tone={budgets.length && budgetLimit.minus(budgetSpent).isNegative() ? "critical" : "neutral"}
          hint={budgets.length ? `${formatINR(budgetSpent)} of ${formatINR(budgetLimit)} used` : "Create a budget to track this"}
        />
        <SummaryCard
          title="Savings rate · this month"
          value={rate === null ? "—" : `${rate.toFixed(1)}%`}
          icon={TrendingUp}
          tone={rate === null ? "neutral" : rate < 0 ? "critical" : "income"}
          hint={rate === null ? "No income recorded this month" : `Calculated: (income − expenses) ÷ income`}
        />
        <SummaryCard title="Tracked savings balance" value={formatINR(savingsBalance)} icon={PiggyBank} hint="Balance of savings-type accounts (not goal progress)" />
        <SummaryCard
          title="Net worth across accounts"
          value={formatINR(sum(balances.filter((b) => b.is_active).map((b) => b.balance)))}
          icon={Landmark}
          hint="All active account balances, credit cards subtracted"
          className="sm:col-span-2 xl:col-span-1"
        />
      </section>

      <Insights items={insights} />

      <DashboardCharts data={chartData} />

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentTransactions transactions={recent} categories={categories} accounts={accounts} />
        <TopCategories totals={parents} totalExpense={cur.netExpense.toNumber()} />
        <BudgetAlertsWidget usage={budgets} notifications={unread} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingRecurring items={upcoming} today={today} />
        <SavingsGoalsWidget goals={goals} />
      </div>
    </div>
  );
}
