"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, CHART_SERIES, ChartDataTable, ChartEmpty, ChartTooltipContent } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatINR } from "@/lib/finance/money";

export interface PieSlice {
  id: string;
  name: string;
  value: number;
  color: string | null;
}

/** Donut of category totals: top 7 + "Other"; colour follows the category, never its rank. */
export function ExpensePieChart({ data, height = 260 }: { data: PieSlice[]; height?: number }) {
  const reduced = useReducedMotion();
  const positive = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (positive.length === 0) return <ChartEmpty message="No expenses to break down yet." />;
  const total = positive.reduce((s, d) => s + d.value, 0);
  const top = positive.slice(0, 7);
  const rest = positive.slice(7);
  const slices = [...top];
  if (rest.length > 0) {
    slices.push({ id: "other", name: `Other (${rest.length})`, value: rest.reduce((s, d) => s + d.value, 0), color: CHART_COLORS.muted });
  }
  const colorFor = (s: PieSlice, i: number) => s.color ?? CHART_SERIES[i % CHART_SERIES.length];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="w-full md:w-1/2">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip content={<ChartTooltipContent />} />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={1.5}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={!reduced}
            >
              {slices.map((s, i) => (
                <Cell key={s.id} fill={colorFor(s, i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-col gap-1.5 text-sm md:w-1/2" aria-label="Category breakdown">
        {slices.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: colorFor(s, i) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="tabular text-muted-foreground">{((s.value / total) * 100).toFixed(1)}%</span>
            <span className="tabular w-24 text-right font-medium">{formatINR(s.value)}</span>
          </li>
        ))}
      </ul>
      <ChartDataTable caption="Expenses by category" columns={["Category", "Amount", "Share"]} rows={slices.map((s) => [s.name, formatINR(s.value), `${((s.value / total) * 100).toFixed(1)}%`])} />
    </div>
  );
}
