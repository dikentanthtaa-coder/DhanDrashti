"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartLegend, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatINR } from "@/lib/finance/money";

export interface SavingsPoint {
  label: string;
  income: number;
  expense: number;
  savings: number;
}

/** Calculated savings per month (income − net expenses). Not an account balance. */
export function SavingsTrendChart({ data, height = 240 }: { data: SavingsPoint[]; height?: number }) {
  const reduced = useReducedMotion();
  if (!data.some((d) => d.income !== 0 || d.expense !== 0)) return <ChartEmpty message="Add income and expenses to see your savings trend." />;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => compactINR(v)} />
          <ReferenceLine y={0} stroke={CHART_COLORS.axis} />
          <Tooltip cursor={{ stroke: CHART_COLORS.axis }} content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="savings" name="Savings" stroke={CHART_COLORS.income} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={!reduced} />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend items={[{ label: "Monthly savings (income − expenses)", color: CHART_COLORS.income }]} />
      <ChartDataTable caption="Monthly savings" columns={["Month", "Income", "Expenses", "Savings"]} rows={data.map((d) => [d.label, formatINR(d.income), formatINR(d.expense), formatINR(d.savings)])} />
    </div>
  );
}
