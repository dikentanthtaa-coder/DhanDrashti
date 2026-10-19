"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterX } from "lucide-react";
import type { AccountRow, CategoryRow } from "@/lib/types/database";
import { PAYMENT_METHODS } from "@/lib/constants";
import type { ReportFilters as Filters } from "@/components/reports/report-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

/** Dimension filters in one row; writes URL params so the server re-renders. */
export function ReportFilters({ filters, categories, accounts }: { filters: Filters; categories: CategoryRow[]; accounts: AccountRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [merchant, setMerchant] = React.useState(filters.merchant ?? "");
  const [main, setMain] = React.useState(filters.mainCategoryId ?? "");

  const expenseParents = categories.filter((c) => !c.parent_id && c.type === "expense" && !c.is_archived);
  const incomeParents = categories.filter((c) => !c.parent_id && c.type === "income" && !c.is_archived);
  const subs = categories.filter((c) => c.parent_id === main && !c.is_archived);

  const push = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const hasAny = Boolean(filters.type || filters.mainCategoryId || filters.subCategoryId || filters.accountId || filters.paymentMethod || filters.merchant);

  return (
    <form
      className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6"
      data-pending={pending || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        push({ merchant: merchant.trim() });
      }}
      aria-label="Report filters"
    >
      <div className="grid gap-1">
        <Label htmlFor="f-type" className="text-xs">
          Type
        </Label>
        <NativeSelect id="f-type" value={filters.type ?? ""} onChange={(e) => push({ type: e.target.value })}>
          <NativeSelectOption value="">All types</NativeSelectOption>
          <NativeSelectOption value="expense">Expenses</NativeSelectOption>
          <NativeSelectOption value="income">Income</NativeSelectOption>
          <NativeSelectOption value="refund">Refunds</NativeSelectOption>
          <NativeSelectOption value="transfer">Transfers</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-main" className="text-xs">
          Main category
        </Label>
        <NativeSelect
          id="f-main"
          value={main}
          onChange={(e) => {
            setMain(e.target.value);
            push({ mainCategoryId: e.target.value, subCategoryId: null });
          }}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          <optgroup label="Expense">
            {expenseParents.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </optgroup>
          <optgroup label="Income">
            {incomeParents.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </optgroup>
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-sub" className="text-xs">
          Subcategory
        </Label>
        <NativeSelect id="f-sub" value={filters.subCategoryId ?? ""} onChange={(e) => push({ subCategoryId: e.target.value })} disabled={!main || subs.length === 0}>
          <NativeSelectOption value="">{main ? "All subcategories" : "Pick a main category"}</NativeSelectOption>
          {subs.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-account" className="text-xs">
          Account
        </Label>
        <NativeSelect id="f-account" value={filters.accountId ?? ""} onChange={(e) => push({ accountId: e.target.value })}>
          <NativeSelectOption value="">All accounts</NativeSelectOption>
          {accounts.map((a) => (
            <NativeSelectOption key={a.id} value={a.id}>
              {a.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-method" className="text-xs">
          Payment method
        </Label>
        <NativeSelect id="f-method" value={filters.paymentMethod ?? ""} onChange={(e) => push({ paymentMethod: e.target.value })}>
          <NativeSelectOption value="">All methods</NativeSelectOption>
          {PAYMENT_METHODS.map((m) => (
            <NativeSelectOption key={m.value} value={m.value}>
              {m.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-merchant" className="text-xs">
          Merchant
        </Label>
        <div className="flex gap-1">
          <Input id="f-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Search merchant" maxLength={120} />
          <Button type="submit" variant="outline" size="icon" aria-label="Apply merchant filter">
            →
          </Button>
        </div>
      </div>
      {hasAny ? (
        <div className="col-span-full">
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
        </div>
      ) : null}
    </form>
  );
}
