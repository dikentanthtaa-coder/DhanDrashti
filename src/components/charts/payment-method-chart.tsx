"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatINR } from "@/lib/finance/money";

export interface MethodPoint {
  label: string;
  total: number;
}

export function PaymentMethodChart({ data, height = 220 }: { data: MethodPoint[]; height?: number }) {
  const reduced = useReducedMotion();
  if (!data.some((d) => d.total !== 0)) return <ChartEmpty message="No spending by payment method yet." />;
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => compactINR(v)} />
          <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} width={92} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
          <Bar dataKey="total" name="Spent" fill={CHART_COLORS.transfer} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={!reduced} />
        </BarChart>
      </ResponsiveContainer>
      <ChartDataTable caption="Spending by payment method" columns={["Payment method", "Spent"]} rows={data.map((d) => [d.label, formatINR(d.total)])} />
    </div>
  );
}
