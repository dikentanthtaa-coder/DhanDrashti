"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatDisplayDate } from "@/lib/finance/dates";
import { formatINR } from "@/lib/finance/money";

export interface TrendPoint {
  day: string;
  expense: number;
}

export function SpendingTrendChart({ data, height = 260 }: { data: TrendPoint[]; height?: number }) {
  const reduced = useReducedMotion();
  const hasData = data.some((d) => d.expense !== 0);
  if (!hasData) return <ChartEmpty message="No expenses in this period yet." />;
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="day"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.axis }}
            interval={tickEvery - 1}
            tickFormatter={(v: string) => formatDisplayDate(v, "d MMM")}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => compactINR(v)} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis }}
            content={<ChartTooltipContent labelFormatter={(l) => formatDisplayDate(String(l), "EEE, d MMM yyyy")} />}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Expenses"
            stroke={CHART_COLORS.expense}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={!reduced}
          />
        </LineChart>
      </ResponsiveContainer>
      <ChartDataTable caption="Daily expenses" columns={["Day", "Expenses"]} rows={data.map((d) => [formatDisplayDate(d.day), formatINR(d.expense)])} />
    </div>
  );
}
