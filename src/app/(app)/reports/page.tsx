import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Scale, TrendingUp } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { eachDayInRange, formatDisplayDate, formatMonthLabel, todayInTimezone } from "@/lib/finance/dates";
import { rangeFromSearchParams } from "@/lib/finance/range-params";
import { formatINR } from "@/lib/finance/money";
import { listAccounts } from "@/lib/data/accounts";
import { getMonthlyTotals } from "@/lib/data/reports";
import { buildReport, parseReportFilters } from "@/components/reports/report-data";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { SummaryCard } from "@/components/common/summary-card";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportCharts } from "@/components/reports/report-charts";
import { CategoryTotalsTable, MerchantTotalsTable, PaymentMethodTotalsTable } from "@/components/reports/report-tables";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const { preset, range } = rangeFromSearchParams(params, today, "this_month");
  const filters = parseReportFilters(params);

  const [report, accounts, monthly] = await Promise.all([buildReport(range, filters), listAccounts(), getMonthlyTotals(range)]);
  const t = report.totals;
  const rangeLabel = `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
  const prevLabel = `vs ${formatDisplayDate(report.previous.start)} – ${formatDisplayDate(report.previous.end)}`;

  const dayMap = new Map(report.daily.map((d) => [d.day, d]));
  const days = eachDayInRange(range);
  const trend = days.map((day) => ({ day, expense: Number(dayMap.get(day)?.expense ?? 0) }));
  const incomeExpense =
    days.length > 62 && !report.filtered
      ? monthly.map((m) => ({ label: formatMonthLabel(m.month), income: Number(m.income), expense: Number(m.expense) }))
      : days.length > 62
        ? monthlyFromDaily(report.daily)
        : days.map((day) => ({ label: formatDisplayDate(day, "d MMM"), income: Number(dayMap.get(day)?.income ?? 0), expense: Number(dayMap.get(day)?.expense ?? 0) }));
  const pie = report.parentTotals.map((c) => ({ id: c.category_id, name: c.category_name, value: Number(c.total), color: c.color }));
  const methods = report.paymentMethodTotals.map((m) => ({ label: PAYMENT_METHOD_LABELS[m.payment_method] ?? m.payment_method, total: Number(m.total) }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" showDescription description={`${rangeLabel} · ${report.days} day${report.days === 1 ? "" : "s"}`} actions={<ReportExportMenu />} />

      <section className="no-print flex flex-col gap-3 rounded-xl border bg-card p-3" aria-label="Filters">
        <DateRangeFilter preset={preset} range={range} today={today} />
        <ReportFilters filters={filters} categories={report.categories} accounts={accounts} />
      </section>

      {report.capped ? (
        <Alert>
          <AlertDescription>This selection exceeded the report limit; metrics are computed from the first 100,000 matching transactions. Narrow the range for exact figures.</AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Report metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total income" value={formatINR(t.income)} icon={ArrowUpRight} tone="income" delta={{ value: report.changes.income, label: prevLabel }} />
        <SummaryCard title="Total expenses" value={formatINR(t.netExpense)} icon={ArrowDownRight} tone="expense" delta={{ value: report.changes.expense, label: prevLabel, invert: true }} hint={t.refunds.gt(0) ? `After ${formatINR(t.refunds)} in refunds` : "Net of refunds"} />
        <SummaryCard title="Net cash flow" value={formatINR(t.netCashFlow)} icon={Scale} tone={t.netCashFlow.isNegative() ? "critical" : "neutral"} delta={{ value: report.changes.netCashFlow, label: prevLabel }} />
        <SummaryCard title="Savings rate" value={report.savingsRate === null ? "—" : `${report.savingsRate.toFixed(1)}%`} icon={TrendingUp} tone={report.savingsRate === null ? "neutral" : report.savingsRate < 0 ? "critical" : "income"} hint={report.savingsRate === null ? "No income in this period" : "(income − expenses) ÷ income"} />
        <SummaryCard title="Average daily expense" value={formatINR(report.averageDaily)} icon={CalendarDays} hint={`Across ${report.days} day${report.days === 1 ? "" : "s"}`} />
        <SummaryCard
          title="Highest-spending day"
          value={report.highestDay ? formatINR(report.highestDay.expense) : "—"}
          icon={ArrowDownRight}
          hint={report.highestDay ? formatDisplayDate(report.highestDay.day, "EEEE, d MMM yyyy") : "No expenses in this period"}
        />
        <SummaryCard title="Transfers between accounts" value={formatINR(t.transfers)} hint="Not counted as income or expense" />
        <SummaryCard title="Previous period expenses" value={formatINR(report.previousTotals.netExpense)} hint={`${formatDisplayDate(report.previous.start)} – ${formatDisplayDate(report.previous.end)}`} />
      </section>

      <ReportCharts trend={trend} incomeExpense={incomeExpense} pie={pie} methods={methods} rangeLabel={rangeLabel} />

      <CategoryTotalsTable parents={report.parentTotals} leaves={report.categoryTotals} totalExpense={t.netExpense.toNumber()} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MerchantTotalsTable rows={report.merchantTotals} totalExpense={t.netExpense.toNumber()} />
        <PaymentMethodTotalsTable rows={report.paymentMethodTotals} totalExpense={t.netExpense.toNumber()} />
      </div>
    </div>
  );
}

function monthlyFromDaily(daily: { day: string; income: number; expense: number }[]) {
  const map = new Map<string, { label: string; income: number; expense: number }>();
  for (const d of daily) {
    const key = `${d.day.slice(0, 7)}-01`;
    const e = map.get(key) ?? { label: formatMonthLabel(key), income: 0, expense: 0 };
    e.income += Number(d.income);
    e.expense += Number(d.expense);
    map.set(key, e);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}
