"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { BudgetRow, CategoryRow } from "@/lib/types/database";
import { z } from "zod";
import { budgetSchema, type BudgetInput } from "@/lib/validation/budgets";

type BudgetValues = z.output<typeof budgetSchema>;
import { createBudgetAction, updateBudgetAction } from "@/lib/actions/budgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";
import { CategorySelector } from "@/components/common/category-selector";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const PRESET_THRESHOLDS = [50, 75, 80, 90, 100];

function toMonthInput(d: string | null | undefined): string {
  return d ? d.slice(0, 7) : "";
}
function fromMonthInput(m: string): string {
  return m ? `${m}-01` : "";
}

export function BudgetFormDialog({
  trigger,
  categories,
  budget,
  defaultMonth,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  categories: CategoryRow[];
  budget?: BudgetRow | null;
  defaultMonth: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "New monthly budget"}</DialogTitle>
          <DialogDescription>
            Budgets repeat every month from the start month until the optional end month. Spending counts expenses net of refunds.
          </DialogDescription>
        </DialogHeader>
        {isOpen ? <BudgetForm categories={categories} budget={budget ?? null} defaultMonth={defaultMonth} close={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({ categories, budget, defaultMonth, close }: { categories: CategoryRow[]; budget: BudgetRow | null; defaultMonth: string; close: () => void }) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<"overall" | "category">(budget?.category_id ? "category" : "overall");
  const [customThreshold, setCustomThreshold] = React.useState("");

  const form = useForm<BudgetInput, unknown, BudgetValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: budget?.category_id ?? "",
      amountLimit: budget ? String(budget.amount_limit) : "",
      periodStart: budget?.period_start ?? defaultMonth,
      periodEnd: budget?.period_end ?? "",
      alertThresholds: budget?.alert_thresholds ?? [80, 100],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    const payload = { ...values, categoryId: scope === "overall" ? "" : (values.categoryId ?? ""), periodEnd: values.periodEnd ?? "" };
    startTransition(async () => {
      const result = budget ? await updateBudgetAction(budget.id, payload) : await createBudgetAction(payload);
      if (result.ok) {
        toast.success(result.message ?? "Saved");
        close();
      } else {
        setFormError(result.error);
        for (const [k, v] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(k as keyof BudgetInput, { message: v[0] });
        }
      }
    });
  });

  const errors = form.formState.errors;
  const thresholds = form.watch("alertThresholds") ?? [];

  const toggleThreshold = (t: number, on: boolean) => {
    const set = new Set((thresholds as number[]).map(Number));
    if (on) set.add(t);
    else set.delete(t);
    form.setValue("alertThresholds", [...set].sort((a, b) => a - b), { shouldDirty: true });
  };

  return (
        <form onSubmit={onSubmit} noValidate aria-busy={pending}>
          <FieldGroup>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Field>
              <FieldLabel htmlFor="budget-scope">Applies to</FieldLabel>
              <NativeSelect id="budget-scope" value={scope} onChange={(e) => setScope(e.target.value as "overall" | "category")}>
                <NativeSelectOption value="overall">Overall (all spending)</NativeSelectOption>
                <NativeSelectOption value="category">A category</NativeSelectOption>
              </NativeSelect>
            </Field>
            {scope === "category" ? (
              <Field data-invalid={!!errors.categoryId}>
                <FieldLabel htmlFor="budget-category">Category</FieldLabel>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <CategorySelector
                      id="budget-category"
                      categories={categories}
                      type="expense"
                      value={field.value || null}
                      onChange={(id) => field.onChange(id ?? "")}
                      invalid={!!errors.categoryId}
                    />
                  )}
                />
                <FieldDescription>A main category budget includes all of its subcategories.</FieldDescription>
                <FieldError errors={[errors.categoryId]} />
              </Field>
            ) : null}
            <Field data-invalid={!!errors.amountLimit}>
              <FieldLabel htmlFor="budget-amount">Monthly limit</FieldLabel>
              <AmountInput id="budget-amount" aria-invalid={!!errors.amountLimit} {...form.register("amountLimit")} />
              <FieldError errors={[errors.amountLimit]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.periodStart}>
                <FieldLabel htmlFor="budget-start">Start month</FieldLabel>
                <Controller
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <Input id="budget-start" type="month" value={toMonthInput(field.value)} onChange={(e) => field.onChange(fromMonthInput(e.target.value))} aria-invalid={!!errors.periodStart} />
                  )}
                />
                <FieldError errors={[errors.periodStart]} />
              </Field>
              <Field data-invalid={!!errors.periodEnd}>
                <FieldLabel htmlFor="budget-end">End month (optional)</FieldLabel>
                <Controller
                  control={form.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <Input id="budget-end" type="month" value={toMonthInput(field.value)} onChange={(e) => field.onChange(fromMonthInput(e.target.value))} aria-invalid={!!errors.periodEnd} />
                  )}
                />
                <FieldDescription>Exclusive: the budget ends before this month.</FieldDescription>
                <FieldError errors={[errors.periodEnd]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.alertThresholds}>
              <FieldLabel>Alert when usage reaches</FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Alert thresholds">
                {Array.from(new Set([...PRESET_THRESHOLDS, ...(thresholds as number[]).map(Number)]))
                  .sort((a, b) => a - b)
                  .map((t) => {
                    const checked = (thresholds as number[]).map(Number).includes(t);
                    return (
                      <label key={t} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleThreshold(t, v === true)} aria-label={`${t} percent`} />
                        {t}%
                      </label>
                    );
                  })}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(e.target.value)}
                    placeholder="Custom %"
                    className="w-24"
                    aria-label="Custom threshold percent"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const n = Number(customThreshold);
                      if (Number.isInteger(n) && n >= 1 && n <= 200) {
                        toggleThreshold(n, true);
                        setCustomThreshold("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <FieldDescription>Each threshold alerts once per month. Up to 5 thresholds.</FieldDescription>
              <FieldError errors={[errors.alertThresholds as { message?: string } | undefined]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {budget ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
  );
}
