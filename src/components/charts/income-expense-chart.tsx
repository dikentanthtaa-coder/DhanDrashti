"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartLegend, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatINR } from "@/lib/finance/money";

export interface IncomeExpensePoint {
  label: string; // display label
  income: number;
  expense: number;
}

export function IncomeExpenseChart({ data, height = 260 }: { data: IncomeExpensePoint[]; height?: number }) {
  const reduced = useReducedMotion();
  if (!data.some((d) => d.income !== 0 || d.expense !== 0)) return <ChartEmpty />;
  const tickEvery = Math.max(1, Math.ceil(data.length / 8));
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} interval={tickEvery - 1} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => compactINR(v)} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
          <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} />
          <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} />
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Income", color: CHART_COLORS.income },
          { label: "Expenses", color: CHART_COLORS.expense },
        ]}
      />
      <ChartDataTable caption="Income versus expenses" columns={["Period", "Income", "Expenses"]} rows={data.map((d) => [d.label, formatINR(d.income), formatINR(d.expense)])} />
    </div>
  );
}
