"use client";

import * as React from "react";
import { savingsIfReduced } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/finance/money";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/common/form-select";

export function WhatIfReducer({ categories }: { categories: { id: string; name: string; total: number }[] }) {
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [percent, setPercent] = React.useState(10);
  const selected = categories.find((c) => c.id === categoryId) ?? categories[0];
  if (!selected) return null;
  const saving = savingsIfReduced(selected.total, percent);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="whatif-category">Category</Label>
          <FormSelect
            id="whatif-category"
            value={categoryId}
            onValueChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name, text: c.name, description: `${formatINR(c.total)} this month` }))}
          />
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
            className="h-10 w-full accent-primary"
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
