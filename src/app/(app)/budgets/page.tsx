import type { Metadata } from "next";
import { Target } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { isValidDateString, monthStart, todayInTimezone } from "@/lib/finance/dates";
import { getBudgetHistory, getBudgetUsage, listBudgets } from "@/lib/data/budgets";
import { listCategories } from "@/lib/data/categories";
import { money, formatINR, percentOf } from "@/lib/finance/money";
import { formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SummaryCard } from "@/components/common/summary-card";
import { MonthNav } from "@/components/budgets/month-nav";
import { NewBudgetButton } from "@/components/budgets/new-budget-button";
import { BudgetProgressCard } from "@/components/budgets/budget-progress-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const currentMonth = monthStart(today);
  const monthParam = typeof params.month === "string" && isValidDateString(params.month) ? monthStart(params.month) : currentMonth;

  const [usage, budgets, categories] = await Promise.all([getBudgetUsage(monthParam), listBudgets(), listCategories()]);
  const budgetById = new Map(budgets.map((b) => [b.id, b]));
  const histories = await Promise.all(usage.map((u) => getBudgetHistory(u.budget_id, 6)));

  const totalLimit = usage.reduce((acc, u) => acc.plus(money(u.amount_limit)), money(0));
  const totalSpent = usage.reduce((acc, u) => acc.plus(money(u.spent)), money(0));
  const overall = usage.find((u) => u.category_id === null);
  const overCount = usage.filter((u) => Number(u.percent_used) >= 100).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        showDescription
        title="Budgets"
        description="Monthly limits for overall spending and individual categories."
        actions={
          <>
            <MonthNav month={monthParam} basePath="/budgets" currentMonth={currentMonth} />
            <NewBudgetButton categories={categories} defaultMonth={currentMonth} />
          </>
        }
      />

      {usage.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard title="Total budgeted" value={formatINR(totalLimit)} hint={`${usage.length} budget${usage.length === 1 ? "" : "s"} active this month`} />
          <SummaryCard
            title="Total spent"
            value={formatINR(totalSpent)}
            tone={totalSpent.gt(totalLimit) ? "critical" : "neutral"}
            hint={`${formatPercent(percentOf(totalSpent, totalLimit), 1)} of all limits`}
          />
          <SummaryCard
            title={overall ? "Overall budget" : "Over budget"}
            value={overall ? formatPercent(Number(overall.percent_used), 1) : String(overCount)}
            tone={overall ? (Number(overall.percent_used) >= 100 ? "critical" : Number(overall.percent_used) >= 80 ? "warning" : "neutral") : overCount > 0 ? "critical" : "neutral"}
            hint={overall ? `${formatINR(overall.remaining)} remaining` : overCount > 0 ? "budgets exceeded this month" : "No budgets exceeded"}
          />
        </div>
      ) : null}

      {usage.length === 0 ? (
        <EmptyState
          icon={Target}
          title={budgets.length === 0 ? "No budgets yet" : "No budgets cover this month"}
          description={
            budgets.length === 0
              ? "Set a monthly limit for your overall spending or a category like Food & Eating. You'll be alerted at 80% and 100% by default."
              : "Create a budget that starts in this month, or navigate to a month that has one."
          }
          action={<NewBudgetButton categories={categories} defaultMonth={monthParam} />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {usage.map((u, i) => (
            <BudgetProgressCard key={u.budget_id} usage={u} budget={budgetById.get(u.budget_id) ?? null} history={histories[i]} categories={categories} defaultMonth={monthParam} />
          ))}
        </div>
      )}

      <Alert>
        <Target />
        <AlertTitle>How budgets are calculated</AlertTitle>
        <AlertDescription>
          Spending counts expenses net of refunds for the calendar month in your timezone. Transfers between your accounts and
          unconfirmed recurring reminders are excluded. A main-category budget includes its subcategories. Each alert threshold
          notifies you once per month; editing a limit does not re-send alerts already issued.
        </AlertDescription>
      </Alert>
    </div>
  );
}
