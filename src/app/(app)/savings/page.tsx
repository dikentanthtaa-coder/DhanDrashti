import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Lightbulb, PiggyBank, Target } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { addMonthsToDateString, formatMonthLabel, monthEnd, monthStart, previousRange, todayInTimezone } from "@/lib/finance/dates";
import { getCategoryTotals, getMonthlyTotals, getPeriodSummary, rollupToParents } from "@/lib/data/reports";
import { listSavingsGoals } from "@/lib/data/savings";
import { listAccounts } from "@/lib/data/accounts";
import { getBudgetUsage } from "@/lib/data/budgets";
import { monthlySavings, monthlySavingsTarget, monthsUntil, percentChange, savingsRate, suggestedMonthlyContribution, totalsFromSummary } from "@/lib/finance/calculations";
import { formatINR, money } from "@/lib/finance/money";
import { formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { SummaryCard } from "@/components/common/summary-card";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/charts/chart-primitives";
import { SavingsTargetForm } from "@/components/savings/savings-target-form";
import { SavingsGoalCard } from "@/components/savings/savings-goal-card";
import { NewGoalButton } from "@/components/savings/new-goal-button";
import { SavingsTrendChart } from "@/components/savings/savings-trend-chart";
import { WhatIfReducer } from "@/components/savings/what-if-reducer";
import { CategoryIcon } from "@/components/common/category-icon";

export const metadata: Metadata = { title: "Savings planner" };

export default async function SavingsPage() {
  const { profile, timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const thisMonth = { start: monthStart(today), end: monthEnd(today) };
  const lastMonth = previousRange(thisMonth);
  const sixMonthsAgo = monthStart(addMonthsToDateString(today, -5));

  const [summary, prevSummary, monthly, categoryTotals, prevCategoryTotals, goals, accounts, budgetUsage] = await Promise.all([
    getPeriodSummary(thisMonth),
    getPeriodSummary(lastMonth),
    getMonthlyTotals({ start: sixMonthsAgo, end: thisMonth.end }),
    getCategoryTotals(thisMonth, "expense"),
    getCategoryTotals(lastMonth, "expense"),
    listSavingsGoals(),
    listAccounts({ activeOnly: false }),
    getBudgetUsage(today),
  ]);

  const totals = totalsFromSummary(summary);
  const prevTotals = totalsFromSummary(prevSummary);
  const rate = savingsRate(totals.income, totals.netExpense);
  const target = monthlySavingsTarget(profile.savings_target_type, profile.savings_target_value, totals.income);
  const targetProgress = target && target.gt(0) ? Math.min(100, Math.max(0, totals.netCashFlow.div(target).times(100).toNumber())) : null;

  // Fill all six months so the chart has a continuous axis.
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) monthKeys.push(monthStart(addMonthsToDateString(today, -i)));
  const byMonth = new Map(monthlySavings(monthly).map((m) => [m.month, m]));
  const trend = monthKeys.map((m) => {
    const row = byMonth.get(m);
    return {
      month: formatMonthLabel(m),
      income: row ? row.income.toNumber() : 0,
      expense: row ? row.expense.toNumber() : 0,
      savings: row ? row.savings.toNumber() : 0,
    };
  });

  const topCategories = rollupToParents(categoryTotals).filter((c) => Number(c.total) > 0).slice(0, 5);
  const prevByCategory = new Map(rollupToParents(prevCategoryTotals).map((c) => [c.category_id, Number(c.total)]));
  const overruns = budgetUsage.filter((b) => Number(b.percent_used) >= 100);
  const expenseChange = percentChange(totals.netExpense, prevTotals.netExpense);
  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Savings planner" description={`Plan how much to set aside each month and track progress toward your goals. ${formatMonthLabel(thisMonth.start)}.`} actions={<NewGoalButton accounts={accounts} />} />

      <div className="grid gap-4 sm:grid-cols-2 @5xl:grid-cols-4">
        <SummaryCard title="Income this month" value={formatINR(totals.income)} tone="income" icon={ArrowUpRight} />
        <SummaryCard title="Expenses this month" value={formatINR(totals.netExpense)} tone="expense" icon={ArrowDownRight} delta={{ value: expenseChange, label: "vs last month", invert: true }} />
        <SummaryCard
          title="Calculated savings"
          value={formatINR(totals.netCashFlow)}
          tone={totals.netCashFlow.lt(0) ? "critical" : "neutral"}
          hint="Income − expenses. Not the same as money in a savings account."
        />
        <SummaryCard title="Savings rate" value={rate === null ? "—" : formatPercent(rate, 1)} hint={rate === null ? "No income recorded this month" : "Share of income not spent"} />
      </div>

      <div className="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <Card className="@4xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" aria-hidden="true" /> Monthly target
            </CardTitle>
            <CardDescription>
              {target ? (
                <>
                  Target {formatINR(target)} · {targetProgress !== null ? `${formatPercent(targetProgress, 0)} reached` : "—"}
                  {profile.savings_target_type === "percent" ? ` (${profile.savings_target_value}% of this month's income)` : ""}
                </>
              ) : profile.savings_target_type === "percent" ? (
                "A percentage target needs income this month to compute."
              ) : (
                "Set a fixed amount or a percentage of income."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {target && targetProgress !== null ? (
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(targetProgress)} aria-label="Progress toward monthly savings target">
                <div className="h-full rounded-full bg-primary" style={{ width: `${targetProgress}%` }} />
              </div>
            ) : null}
            <SavingsTargetForm type={profile.savings_target_type} value={profile.savings_target_value} />
          </CardContent>
        </Card>
        <ChartCard title="Monthly savings trend" description="Income minus expenses for the last six months" className="@4xl:col-span-2">
          <SavingsTrendChart data={trend} target={target ? target.toNumber() : null} />
        </ChartCard>
      </div>

      <section aria-labelledby="goals-heading" className="flex flex-col gap-3">
        <h2 id="goals-heading" className="text-lg font-semibold">
          Savings goals
        </h2>
        {goals.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No savings goals yet" description="Create a goal like an emergency fund or a trip. Contributions are transfers between your accounts, so they never count as spending." action={<NewGoalButton accounts={accounts} />} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 @4xl:grid-cols-3">
            {goals.map((g) => (
              <SavingsGoalCard key={g.id} goal={g} accounts={accounts} today={today} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reco-heading" className="flex flex-col gap-3">
        <h2 id="reco-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Lightbulb className="size-5" aria-hidden="true" /> Recommendations
        </h2>
        <p className="text-sm text-muted-foreground">Based only on your recorded transactions and budgets. These are estimates — no guaranteed savings or returns.</p>
        <div className="grid gap-4 @2xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Largest spending categories</CardTitle>
              <CardDescription>This month compared with last month</CardDescription>
            </CardHeader>
            <CardContent>
              {topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded this month yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {topCategories.map((c) => {
                    const prev = prevByCategory.get(c.category_id) ?? 0;
                    const change = percentChange(Number(c.total), prev);
                    const share = totals.netExpense.gt(0) ? money(c.total).div(totals.netExpense).times(100).toNumber() : 0;
                    return (
                      <li key={c.category_id} className="flex items-center gap-3 text-sm">
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{c.category_name}</span>
                        <span className="text-xs text-muted-foreground">{formatPercent(share, 0)}</span>
                        <span className="tabular font-medium">{formatINR(c.total)}</span>
                        <span className={`w-16 text-right text-xs tabular ${change === null ? "text-muted-foreground" : change > 0 ? "text-status-critical" : "text-status-good"}`}>
                          {change === null ? "new" : `${change > 0 ? "+" : ""}${change.toFixed(0)}%`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">How this is calculated: net expenses (after refunds) grouped by main category; change compares with the previous calendar month.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What if you cut back?</CardTitle>
              <CardDescription>Estimate the monthly saving from reducing one category</CardDescription>
            </CardHeader>
            <CardContent>
              {topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Record some expenses to run a what-if estimate.</p>
              ) : (
                <WhatIfReducer categories={topCategories.map((c) => ({ id: c.category_id, name: c.category_name, total: Number(c.total) }))} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget overruns</CardTitle>
              <CardDescription>Budgets at or above 100% this month</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No budgets yet.{" "}
                  <Link href="/budgets" className="underline underline-offset-4">
                    Create one
                  </Link>{" "}
                  to get overrun alerts.
                </p>
              ) : overruns.length === 0 ? (
                <p className="text-sm text-muted-foreground">All budgets are within their limits. Nice.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {overruns.map((b) => (
                    <li key={b.budget_id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{b.category_name ?? "Overall"}</span>
                      <span className="tabular text-status-critical">{formatINR(money(b.spent).minus(b.amount_limit))} over</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">How this is calculated: spent (net of refunds) − monthly limit, for the current month.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly amount per goal</CardTitle>
              <CardDescription>What it takes to reach each active goal on time</CardDescription>
            </CardHeader>
            <CardContent>
              {activeGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active goals.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {activeGoals.map((g) => {
                    const months = monthsUntil(g.target_date, today);
                    const s = suggestedMonthlyContribution(g.target_amount, g.saved, months);
                    return (
                      <li key={g.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{g.name}</span>
                        <span className="tabular font-medium">{s === null ? "Set a target date" : s.isZero() ? "Reached" : `${formatINR(s)}/mo`}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">How this is calculated: (target − saved) ÷ months remaining until the target date, counting this month.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
