"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { AccountRow, CategoryRow } from "@/lib/types/database";
import { transactionSchema, type TransactionInput, type TransactionValues } from "@/lib/validation/transactions";
import { createTransactionAction } from "@/lib/actions/transactions";
import { ACCOUNT_TYPE_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";
import { CategorySelector } from "@/components/common/category-selector";

/** Dashboard quick-add: minimal expense form in a dialog. */
export function QuickAddExpense({ accounts, categories, today }: { accounts: AccountRow[]; categories: CategoryRow[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const activeAccounts = accounts.filter((a) => a.is_active);

  const defaults: TransactionInput = {
    transactionType: "expense",
    amount: "",
    transactionDate: today,
    accountId: activeAccounts[0]?.id ?? "",
    toAccountId: "",
    categoryId: "",
    paymentMethod: "upi",
    merchant: "",
    note: "",
    isRefund: false,
    savingsGoalId: "",
  };
  const form = useForm<TransactionInput, unknown, TransactionValues>({ resolver: zodResolver(transactionSchema), defaultValues: defaults });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const r = await createTransactionAction(values);
      if (!r.ok) {
        setFormError(r.error);
        if (r.fieldErrors) for (const [f, m] of Object.entries(r.fieldErrors)) form.setError(f as keyof TransactionInput, { message: m[0] });
        return;
      }
      toast.success("Expense added.");
      form.reset(defaults);
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { form.reset(defaults); setFormError(null); } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" /> Quick add expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add expense</DialogTitle>
          <DialogDescription>Record an expense in seconds. Add receipts or notes later from the transaction page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-4">
          {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="qa-amount">Amount</FieldLabel>
                <AmountInput id="qa-amount" autoFocus aria-invalid={!!errors.amount} {...form.register("amount")} />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field data-invalid={!!errors.transactionDate}>
                <FieldLabel htmlFor="qa-date">Date</FieldLabel>
                <Input id="qa-date" type="date" max="9999-12-31" aria-invalid={!!errors.transactionDate} {...form.register("transactionDate")} />
                <FieldError errors={[errors.transactionDate]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.categoryId}>
              <FieldLabel htmlFor="qa-category">Category</FieldLabel>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => <CategorySelector id="qa-category" categories={categories} type="expense" value={field.value || null} onChange={(v) => field.onChange(v ?? "")} invalid={!!errors.categoryId} />}
              />
              <FieldError errors={[errors.categoryId]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.accountId}>
                <FieldLabel htmlFor="qa-account">Account</FieldLabel>
                <NativeSelect id="qa-account" aria-invalid={!!errors.accountId} {...form.register("accountId")}>
                  <NativeSelectOption value="">Choose</NativeSelectOption>
                  {activeAccounts.map((a) => (
                    <NativeSelectOption key={a.id} value={a.id}>
                      {a.name} · {ACCOUNT_TYPE_LABELS[a.account_type]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.accountId]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="qa-method">Method</FieldLabel>
                <NativeSelect id="qa-method" {...form.register("paymentMethod")}>
                  <NativeSelectOption value="">Not specified</NativeSelectOption>
                  {PAYMENT_METHODS.map((m) => (
                    <NativeSelectOption key={m.value} value={m.value}>
                      {m.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field data-invalid={!!errors.merchant}>
              <FieldLabel htmlFor="qa-merchant">Merchant</FieldLabel>
              <Input id="qa-merchant" placeholder="e.g. Zomato" autoComplete="off" {...form.register("merchant")} />
              <FieldError errors={[errors.merchant]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
