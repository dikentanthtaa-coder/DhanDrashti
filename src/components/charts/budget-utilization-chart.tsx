"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartDataTable, ChartEmpty, ChartLegend } from "@/components/charts/chart-primitives";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { formatINR } from "@/lib/finance/money";

export interface BudgetBar {
  id: string;
  label: string;
  spent: number;
  limit: number;
  percent: number;
  state: "ok" | "warning" | "over";
}

const STATE_COLOR = { ok: CHART_COLORS.good, warning: CHART_COLORS.serious, over: CHART_COLORS.critical } as const;
const STATE_LABEL = { ok: "On track", warning: "Near limit", over: "Over budget" } as const;

/** Percent of each budget used; the 100% reference line marks the limit. */
export function BudgetUtilizationChart({ data, height }: { data: BudgetBar[]; height?: number }) {
  const reduced = useReducedMotion();
  if (data.length === 0) return <ChartEmpty message="No budgets for this month yet." />;
  const h = height ?? Math.max(160, 36 * data.length + 40);
  const maxPct = Math.max(120, ...data.map((d) => d.percent));
  return (
    <div>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
          <XAxis type="number" domain={[0, Math.ceil(maxPct / 20) * 20]} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
          <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} width={110} />
          <ReferenceLine x={100} stroke={CHART_COLORS.critical} strokeWidth={1} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as BudgetBar | undefined;
              if (!active || !d) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <div className="mb-1 font-medium">{d.label}</div>
                  <div className="tabular">
                    {formatINR(d.spent)} of {formatINR(d.limit)} ({d.percent.toFixed(1)}%)
                  </div>
                  <div className="text-muted-foreground">{STATE_LABEL[d.state]}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="percent" name="Used" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={!reduced}>
            {data.map((d) => (
              <Cell key={d.id} fill={STATE_COLOR[d.state]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "On track", color: CHART_COLORS.good },
          { label: "Near limit", color: CHART_COLORS.serious },
          { label: "Over budget", color: CHART_COLORS.critical },
        ]}
      />
      <ChartDataTable caption="Budget utilisation" columns={["Budget", "Spent", "Limit", "Used"]} rows={data.map((d) => [d.label, formatINR(d.spent), formatINR(d.limit), `${d.percent.toFixed(1)}%`])} />
    </div>
  );
}
