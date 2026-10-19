"use client";

import * as React from "react";
import { formatINR } from "@/lib/finance/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Categorical slots in validated CVD-safe order; never cycle past 8 (fold to "Other"). */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

export const CHART_COLORS = {
  income: "var(--income)",
  expense: "var(--expense)",
  transfer: "var(--transfer)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  muted: "var(--chart-muted)",
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
  neutral: "var(--muted-foreground)",
};

/** Compact axis tick formatter: ₹1.2L, ₹45k, ₹800 */
export function compactINR(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(abs % 1_00_00_000 === 0 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(abs % 1_00_000 === 0 ? 0 : 1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export const AXIS_TICK = { fontSize: 11, fill: "var(--chart-muted)" } as const;

export function ChartCard({
  title,
  description,
  children,
  action,
  className,
  contentClassName,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action ? <div className="no-print shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("px-2 sm:px-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function ChartEmpty({ message = "No transactions in this period yet." }: { message?: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground" role="status">
      {message}
    </div>
  );
}

export interface TooltipRow {
  name: string;
  value: number;
  color?: string;
}

/** Shared tooltip body: label + rows with INR values. Works with Recharts' content prop. */
export function ChartTooltipContent({
  active,
  label,
  payload,
  labelFormatter,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string | number; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }>;
  labelFormatter?: (label: string | number | undefined, payload?: Record<string, unknown>) => React.ReactNode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{labelFormatter ? labelFormatter(label, first) : label}</div>
      <ul className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {String(p.name ?? p.dataKey ?? "")}
            </span>
            <span className="tabular font-medium">{formatINR(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Accessible legend rendered outside the SVG so screen readers get text. */
export function ChartLegend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: it.color }} aria-hidden="true" />
          <span>{it.label}</span>
          {it.value ? <span className="tabular text-foreground">{it.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Visually-hidden data table for every chart (screen readers, print). */
export function ChartDataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only print:not-sr-only print:mt-2 print:w-full print:text-xs">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
