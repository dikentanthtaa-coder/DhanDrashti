"use client";

import { ChartCard } from "@/components/charts/chart-primitives";
import { SpendingTrendChart, type TrendPoint } from "@/components/charts/spending-trend-chart";
import { IncomeExpenseChart, type IncomeExpensePoint } from "@/components/charts/income-expense-chart";
import { ExpensePieChart, type PieSlice } from "@/components/charts/expense-pie-chart";
import { PaymentMethodChart, type MethodPoint } from "@/components/charts/payment-method-chart";

export function ReportCharts({ trend, incomeExpense, pie, methods, rangeLabel }: { trend: TrendPoint[]; incomeExpense: IncomeExpensePoint[]; pie: PieSlice[]; methods: MethodPoint[]; rangeLabel: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Daily expense trend" description={rangeLabel}>
        <SpendingTrendChart data={trend} height={240} />
      </ChartCard>
      <ChartCard title="Income vs expenses" description={rangeLabel}>
        <IncomeExpenseChart data={incomeExpense} height={240} />
      </ChartCard>
      <ChartCard title="Expenses by category" description="Net of refunds">
        <ExpensePieChart data={pie} height={220} />
      </ChartCard>
      <ChartCard title="Payment methods">
        <PaymentMethodChart data={methods} />
      </ChartCard>
    </div>
  );
}
