"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BudgetHistoryRow } from "@/lib/types/database";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartLegend, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { formatMonthLabel } from "@/lib/finance/dates";
import { formatINR } from "@/lib/finance/money";

export function BudgetHistoryChart({ history }: { history: BudgetHistoryRow[] }) {
  if (history.length === 0) return <ChartEmpty message="No history for this budget yet." />;
  const data = [...history]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((h) => ({ month: formatMonthLabel(h.month), Spent: Number(h.spent), limit: Number(h.amount_limit) }));
  const limit = data[data.length - 1]?.limit ?? 0;
  return (
    <div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={compactINR} width={52} />
            <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)" }} />
            <ReferenceLine y={limit} stroke={CHART_COLORS.critical} strokeWidth={1.5} ifOverflow="extendDomain" />
            <Bar dataKey="Spent" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: "Spent", color: CHART_COLORS.expense },
          { label: "Limit", color: CHART_COLORS.critical, value: formatINR(limit) },
        ]}
      />
      <ChartDataTable caption="Budget history" columns={["Month", "Spent", "Limit"]} rows={data.map((d) => [d.month, formatINR(d.Spent), formatINR(d.limit)])} />
    </div>
  );
}
