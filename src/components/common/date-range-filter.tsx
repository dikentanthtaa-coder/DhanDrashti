"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { RANGE_PRESETS, resolvePreset, type DateRange, type RangePreset } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/common/form-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDisplayDate } from "@/lib/finance/dates";

/**
 * URL-driven date range filter: writes ?preset=…&start=…&end=… so Server
 * Components re-render with the new range (filters live in one row above charts).
 */
export function DateRangeFilter({
  preset,
  range,
  today,
  presets = RANGE_PRESETS,
}: {
  preset: RangePreset;
  range: DateRange;
  today: string;
  presets?: { value: RangePreset; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState(range);
  const [pending, startTransition] = React.useTransition();

  const push = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const onPreset = (value: RangePreset) => {
    if (value === "custom") {
      setOpen(true);
      return;
    }
    const r = resolvePreset(value, today);
    setCustom(r);
    push({ preset: value, start: r.start, end: r.end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={pending || undefined}>
      <Label htmlFor="range-preset" className="sr-only">
        Date range
      </Label>
      <FormSelect
        id="range-preset"
        aria-label="Date range"
        value={preset}
        onValueChange={(v) => onPreset(v as RangePreset)}
        options={presets.map((p) => ({ value: p.value, label: p.label }))}
        className="w-48"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="default" aria-label="Choose custom date range">
            <CalendarDays data-icon="inline-start" />
            <span className="tabular">
              {formatDisplayDate(range.start)} – {formatDisplayDate(range.end)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!custom.start || !custom.end) return;
              const start = custom.start <= custom.end ? custom.start : custom.end;
              const end = custom.start <= custom.end ? custom.end : custom.start;
              push({ preset: "custom", start, end });
              setOpen(false);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="range-start">Start date</Label>
              <Input id="range-start" type="date" value={custom.start} max="9999-12-31" onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="range-end">End date</Label>
              <Input id="range-end" type="date" value={custom.end} max="9999-12-31" onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} required />
            </div>
            <Button type="submit" size="sm">
              Apply range
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
