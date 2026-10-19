"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartLegend, ChartTooltipContent, compactINR } from "@/components/charts/chart-primitives";
import { formatINR } from "@/lib/finance/money";

export interface SavingsTrendPoint {
  month: string; // label
  income: number;
  expense: number;
  savings: number;
}

export function SavingsTrendChart({ data, target }: { data: SavingsTrendPoint[]; target: number | null }) {
  if (data.length === 0 || data.every((d) => d.income === 0 && d.expense === 0)) return <ChartEmpty message="Add income and expenses to see your savings trend." />;
  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={compactINR} width={56} />
            <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: CHART_COLORS.axis }} />
            <ReferenceLine y={0} stroke={CHART_COLORS.axis} />
            {target !== null ? <ReferenceLine y={target} stroke={CHART_COLORS.good} strokeWidth={1.5} ifOverflow="extendDomain" /> : null}
            <Line type="monotone" dataKey="savings" name="Savings" stroke={CHART_COLORS.transfer} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: "Savings (income − expenses)", color: CHART_COLORS.transfer },
          ...(target !== null ? [{ label: "Monthly target", color: CHART_COLORS.good, value: formatINR(target) }] : []),
        ]}
      />
      <ChartDataTable caption="Monthly savings" columns={["Month", "Income", "Expenses", "Savings"]} rows={data.map((d) => [d.month, formatINR(d.income), formatINR(d.expense), formatINR(d.savings)])} />
    </div>
  );
}
