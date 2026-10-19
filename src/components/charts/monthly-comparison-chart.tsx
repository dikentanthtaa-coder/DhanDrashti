"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatINR } from "@/lib/finance/money";

export interface MonthPoint {
  month: string; // yyyy-MM-dd (first of month)
  label: string;
  expense: number;
  current?: boolean;
}

export function MonthlyComparisonChart({ data, height = 240 }: { data: MonthPoint[]; height?: number }) {
  const reduced = useReducedMotion();
  if (!data.some((d) => d.expense !== 0)) return <ChartEmpty message="No monthly expenses recorded yet." />;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => compactINR(v)} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
          <Bar dataKey="expense" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={!reduced}>
            {data.map((d) => (
              <Cell key={d.month} fill={CHART_COLORS.expense} fillOpacity={d.current ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ChartDataTable caption="Monthly expenses" columns={["Month", "Expenses"]} rows={data.map((d) => [d.label, formatINR(d.expense)])} />
    </div>
  );
}
