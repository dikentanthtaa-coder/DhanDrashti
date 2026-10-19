"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { AccountRow, CategoryRow } from "@/lib/types/database";
import type { TransactionFilters as Filters } from "@/lib/validation/transactions";
import { PAYMENT_METHODS } from "@/lib/constants";
import type { DateRange, RangePreset } from "@/lib/finance/dates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { DateRangeFilter } from "@/components/common/date-range-filter";

export function TransactionFilters({
  filters,
  categories,
  accounts,
  preset,
  range,
  today,
}: {
  filters: Filters;
  categories: CategoryRow[];
  accounts: AccountRow[];
  preset: RangePreset;
  range: DateRange;
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [q, setQ] = React.useState(filters.q ?? "");

  const update = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if ((filters.q ?? "") !== q.trim()) update({ q: q.trim() || undefined });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(filters.q || filters.type || filters.categoryId || filters.accountId || filters.paymentMethod || filters.merchant);
  const expenseParents = categories.filter((c) => c.type === "expense" && !c.parent_id);
  const incomeParents = categories.filter((c) => c.type === "income" && !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  return (
    <div className="no-print flex flex-col gap-3" data-pending={pending || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter preset={preset} range={range} today={today} />
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Label htmlFor="tx-search" className="sr-only">
            Search merchant or note
          </Label>
          <Input id="tx-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchant or note…" className="pl-8" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <Label htmlFor="f-type" className="sr-only">Type</Label>
          <NativeSelect id="f-type" value={filters.type ?? ""} onChange={(e) => update({ type: e.target.value || undefined })}>
            <NativeSelectOption value="">All types</NativeSelectOption>
            <NativeSelectOption value="expense">Expenses</NativeSelectOption>
            <NativeSelectOption value="income">Income</NativeSelectOption>
            <NativeSelectOption value="transfer">Transfers</NativeSelectOption>
            <NativeSelectOption value="refund">Refunds</NativeSelectOption>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="f-category" className="sr-only">Category</Label>
          <NativeSelect id="f-category" value={filters.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value || undefined })}>
            <NativeSelectOption value="">All categories</NativeSelectOption>
            {expenseParents.map((p) => (
              <NativeSelectOptGroup key={p.id} label={p.name}>
                <NativeSelectOption value={p.id}>{p.name} (general)</NativeSelectOption>
                {childrenOf(p.id).map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
            <NativeSelectOptGroup label="Income">
              {incomeParents.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.name}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="f-account" className="sr-only">Account</Label>
          <NativeSelect id="f-account" value={filters.accountId ?? ""} onChange={(e) => update({ accountId: e.target.value || undefined })}>
            <NativeSelectOption value="">All accounts</NativeSelectOption>
            {accounts.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="f-method" className="sr-only">Payment method</Label>
          <NativeSelect id="f-method" value={filters.paymentMethod ?? ""} onChange={(e) => update({ paymentMethod: e.target.value || undefined })}>
            <NativeSelectOption value="">All methods</NativeSelectOption>
            {PAYMENT_METHODS.map((m) => (
              <NativeSelectOption key={m.value} value={m.value}>
                {m.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="f-sort" className="sr-only">Sort</Label>
            <NativeSelect id="f-sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value === "date_desc" ? undefined : e.target.value })}>
              <NativeSelectOption value="date_desc">Newest first</NativeSelectOption>
              <NativeSelectOption value="date_asc">Oldest first</NativeSelectOption>
              <NativeSelectOption value="amount_desc">Largest amount</NativeSelectOption>
              <NativeSelectOption value="amount_asc">Smallest amount</NativeSelectOption>
            </NativeSelect>
          </div>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear filters"
              onClick={() => {
                setQ("");
                update({ q: undefined, type: undefined, categoryId: undefined, accountId: undefined, paymentMethod: undefined, merchant: undefined, sort: undefined });
              }}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
