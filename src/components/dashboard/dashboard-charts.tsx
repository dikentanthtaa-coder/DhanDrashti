"use client";

import { ChartCard } from "@/components/charts/chart-primitives";
import { SpendingTrendChart, type TrendPoint } from "@/components/charts/spending-trend-chart";
import { IncomeExpenseChart, type IncomeExpensePoint } from "@/components/charts/income-expense-chart";
import { ExpensePieChart, type PieSlice } from "@/components/charts/expense-pie-chart";
import { MonthlyComparisonChart, type MonthPoint } from "@/components/charts/monthly-comparison-chart";
import { BudgetUtilizationChart, type BudgetBar } from "@/components/charts/budget-utilization-chart";
import { SavingsTrendChart, type SavingsPoint } from "@/components/charts/savings-trend-chart";
import { PaymentMethodChart, type MethodPoint } from "@/components/charts/payment-method-chart";

export interface DashboardChartData {
  trend: TrendPoint[];
  incomeExpense: IncomeExpensePoint[];
  incomeExpenseGranularity: "day" | "month";
  pie: PieSlice[];
  monthly: MonthPoint[];
  budgets: BudgetBar[];
  savings: SavingsPoint[];
  methods: MethodPoint[];
  rangeLabel: string;
}

export function DashboardCharts({ data }: { data: DashboardChartData }) {
  return (
    <>
      <div className="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <ChartCard title="Daily expense trend" description={data.rangeLabel} className="@4xl:col-span-2">
          <SpendingTrendChart data={data.trend} />
        </ChartCard>
        <ChartCard title="Expenses by category" description="Net of refunds · top 7 + other">
          <ExpensePieChart data={data.pie} height={220} />
        </ChartCard>
      </div>
      <div className="grid gap-4 @2xl:grid-cols-2">
        <ChartCard title="Income vs expenses" description={data.incomeExpenseGranularity === "month" ? "By month" : "By day"}>
          <IncomeExpenseChart data={data.incomeExpense} />
        </ChartCard>
        <ChartCard title="Monthly expense comparison" description="Last 6 months, net of refunds">
          <MonthlyComparisonChart data={data.monthly} />
        </ChartCard>
      </div>
      <div className="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <ChartCard title="Budget utilisation" description="This month · 100% line marks each limit">
          <BudgetUtilizationChart data={data.budgets} />
        </ChartCard>
        <ChartCard title="Savings trend" description="Income minus expenses per month (calculated, not a balance)">
          <SavingsTrendChart data={data.savings} />
        </ChartCard>
        <ChartCard title="Payment methods" description="Net spending in the selected period">
          <PaymentMethodChart data={data.methods} />
        </ChartCard>
      </div>
    </>
  );
}
