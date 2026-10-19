"use client";

import * as React from "react";
import { savingsIfReduced } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/finance/money";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function WhatIfReducer({ categories }: { categories: { id: string; name: string; total: number }[] }) {
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [percent, setPercent] = React.useState(10);
  const selected = categories.find((c) => c.id === categoryId) ?? categories[0];
  if (!selected) return null;
  const saving = savingsIfReduced(selected.total, percent);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="whatif-category">Category</Label>
          <NativeSelect id="whatif-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name} · {formatINR(c.total)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="whatif-percent">Reduce by {percent}%</Label>
          <input
            id="whatif-percent"
            type="range"
            min={5}
            max={50}
            step={5}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="accent-primary"
            aria-valuetext={`${percent} percent`}
          />
        </div>
      </div>
      <p className="text-sm">
        Cutting <span className="font-medium">{selected.name}</span> by {percent}% would free up about{" "}
        <span className="font-semibold tabular">{formatINR(saving)}</span> per month.
      </p>
      <p className="text-xs text-muted-foreground">How this is calculated: this month&apos;s net spending in the category × {percent}%. It is an estimate, not a guarantee.</p>
    </div>
  );
}
