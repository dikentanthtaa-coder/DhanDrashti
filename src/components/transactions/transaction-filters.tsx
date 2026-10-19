"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, FilterX, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { AccountRow, CategoryRow } from "@/lib/types/database";
import type { TransactionFilters as Filters } from "@/lib/validation/transactions";
import type { DateRange, RangePreset } from "@/lib/finance/dates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { FormSelect } from "@/components/common/form-select";
import { CategorySelector } from "@/components/common/category-selector";
import { accountOptions, paymentMethodOptions } from "@/components/transactions/select-options";

const TYPE_OPTIONS = [
  { value: "expense", label: "Expenses", icon: <ArrowDownRight className="text-expense" /> },
  { value: "income", label: "Income", icon: <ArrowUpRight className="text-income" /> },
  { value: "transfer", label: "Transfers", icon: <ArrowLeftRight className="text-transfer" /> },
  { value: "refund", label: "Refunds", icon: <RotateCcw className="text-income" /> },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Largest amount" },
  { value: "amount_asc", label: "Smallest amount" },
];

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
  const activeCount = [filters.q, filters.type, filters.categoryId, filters.accountId, filters.paymentMethod, filters.merchant].filter(Boolean).length;
  const accountOpts = React.useMemo(() => accountOptions(accounts, { withType: false }), [accounts]);
  const methodOpts = React.useMemo(() => paymentMethodOptions(), []);
  const selectedCategory = filters.categoryId ? categories.find((c) => c.id === filters.categoryId) : null;
  const categoryType = selectedCategory?.type ?? (filters.type === "income" ? "income" : "expense");

  return (
    <Card className="no-print gap-0 py-0" data-pending={pending || undefined}>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" /> Filters
            {activeCount > 0 ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{activeCount} active</span> : null}
          </h2>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                update({ q: undefined, type: undefined, categoryId: undefined, accountId: undefined, paymentMethod: undefined, merchant: undefined, sort: undefined });
              }}
            >
              <FilterX data-icon="inline-start" /> Clear filters
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter preset={preset} range={range} today={today} />
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="tx-search" className="sr-only">
              Search merchant or note
            </Label>
            <Input id="tx-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchant or note…" className="pl-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 @3xl:grid-cols-5">
          <div className="grid gap-1.5">
            <Label htmlFor="f-type" className="text-xs text-muted-foreground">
              Type
            </Label>
            <FormSelect id="f-type" value={filters.type ?? ""} onValueChange={(v) => update({ type: v || undefined })} options={TYPE_OPTIONS} emptyLabel="All types" placeholder="All types" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-category" className="text-xs text-muted-foreground">
              Category
            </Label>
            <CategorySelector
              id="f-category"
              categories={categories}
              type={categoryType}
              value={filters.categoryId ?? null}
              onChange={(v) => update({ categoryId: v ?? undefined })}
              placeholder="All categories"
              allowClear
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-account" className="text-xs text-muted-foreground">
              Account
            </Label>
            <FormSelect id="f-account" value={filters.accountId ?? ""} onValueChange={(v) => update({ accountId: v || undefined })} options={accountOpts} emptyLabel="All accounts" placeholder="All accounts" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-method" className="text-xs text-muted-foreground">
              Payment method
            </Label>
            <FormSelect id="f-method" value={filters.paymentMethod ?? ""} onValueChange={(v) => update({ paymentMethod: v || undefined })} options={methodOpts} emptyLabel="All methods" placeholder="All methods" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-sort" className="text-xs text-muted-foreground">
              Sort
            </Label>
            <FormSelect id="f-sort" value={filters.sort} onValueChange={(v) => update({ sort: v === "date_desc" ? undefined : v })} options={SORT_OPTIONS} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
