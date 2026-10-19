"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, FilterX, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { AccountRow, CategoryRow } from "@/lib/types/database";
import type { ReportFilters as Filters } from "@/components/reports/report-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormSelect, type FormSelectOption } from "@/components/common/form-select";
import { CategoryIcon } from "@/components/common/category-icon";
import { accountOptions, paymentMethodOptions } from "@/components/transactions/select-options";

const TYPE_OPTIONS: FormSelectOption[] = [
  { value: "expense", label: "Expenses", icon: <ArrowDownRight className="text-expense" /> },
  { value: "income", label: "Income", icon: <ArrowUpRight className="text-income" /> },
  { value: "refund", label: "Refunds", icon: <RotateCcw className="text-income" /> },
  { value: "transfer", label: "Transfers", icon: <ArrowLeftRight className="text-transfer" /> },
];

/** Dimension filters in one row; writes URL params so the server re-renders. */
export function ReportFilters({ filters, categories, accounts }: { filters: Filters; categories: CategoryRow[]; accounts: AccountRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [merchant, setMerchant] = React.useState(filters.merchant ?? "");
  const [main, setMain] = React.useState(filters.mainCategoryId ?? "");

  const toOption = (c: CategoryRow): FormSelectOption => ({ value: c.id, label: c.name, text: c.name, icon: <CategoryIcon icon={c.icon} color={c.color} size="sm" /> });
  const expenseParents = categories.filter((c) => !c.parent_id && c.type === "expense" && !c.is_archived);
  const incomeParents = categories.filter((c) => !c.parent_id && c.type === "income" && !c.is_archived);
  const mainParent = categories.find((c) => c.id === main) ?? null;
  const subs = categories.filter((c) => c.parent_id === main && !c.is_archived);
  const accountOpts = React.useMemo(() => accountOptions(accounts, { withType: false }), [accounts]);
  const methodOpts = React.useMemo(() => paymentMethodOptions(), []);

  const push = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const hasAny = Boolean(filters.type || filters.mainCategoryId || filters.subCategoryId || filters.accountId || filters.paymentMethod || filters.merchant);
  const activeCount = [filters.type, filters.mainCategoryId, filters.subCategoryId, filters.accountId, filters.paymentMethod, filters.merchant].filter(Boolean).length;

  return (
    <Card className="no-print gap-0 py-0" data-pending={pending || undefined}>
      <CardContent className="p-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            push({ merchant: merchant.trim() });
          }}
          aria-label="Report filters"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" /> Filters
              {activeCount > 0 ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{activeCount} active</span> : null}
            </h2>
            {hasAny ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMerchant("");
                  setMain("");
                  push({ type: null, mainCategoryId: null, subCategoryId: null, accountId: null, paymentMethod: null, merchant: null });
                }}
              >
                <FilterX data-icon="inline-start" /> Clear filters
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="grid gap-1.5">
              <Label htmlFor="f-type" className="text-xs text-muted-foreground">
                Type
              </Label>
              <FormSelect id="f-type" value={filters.type ?? ""} onValueChange={(v) => push({ type: v })} options={TYPE_OPTIONS} emptyLabel="All types" placeholder="All types" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-main" className="text-xs text-muted-foreground">
                Main category
              </Label>
              <FormSelect
                id="f-main"
                value={main}
                onValueChange={(v) => {
                  setMain(v);
                  push({ mainCategoryId: v, subCategoryId: null });
                }}
                groups={[
                  { label: "Expense", options: expenseParents.map(toOption) },
                  { label: "Income", options: incomeParents.map(toOption) },
                ]}
                emptyLabel="All categories"
                placeholder="All categories"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-sub" className="text-xs text-muted-foreground">
                Subcategory
              </Label>
              <FormSelect
                id="f-sub"
                value={filters.subCategoryId ?? ""}
                onValueChange={(v) => push({ subCategoryId: v })}
                disabled={!main || subs.length === 0}
                options={subs.map((c) => ({ value: c.id, label: c.name, text: c.name, icon: <CategoryIcon icon={c.icon ?? mainParent?.icon} color={c.color ?? mainParent?.color} size="sm" /> }))}
                emptyLabel={main ? "All subcategories" : "Pick a main category"}
                placeholder={main ? "All subcategories" : "Pick a main category"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-account" className="text-xs text-muted-foreground">
                Account
              </Label>
              <FormSelect id="f-account" value={filters.accountId ?? ""} onValueChange={(v) => push({ accountId: v })} options={accountOpts} emptyLabel="All accounts" placeholder="All accounts" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-method" className="text-xs text-muted-foreground">
                Payment method
              </Label>
              <FormSelect id="f-method" value={filters.paymentMethod ?? ""} onValueChange={(v) => push({ paymentMethod: v })} options={methodOpts} emptyLabel="All methods" placeholder="All methods" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-merchant" className="text-xs text-muted-foreground">
                Merchant
              </Label>
              <div className="flex gap-1.5">
                <Input id="f-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Search merchant" maxLength={120} />
                <Button type="submit" variant="outline" size="icon-lg" aria-label="Apply merchant filter">
                  <Search />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
