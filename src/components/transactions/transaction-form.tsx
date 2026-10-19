"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { AccountRow, CategoryRow, SavingsGoalRow, TransactionRow, TransactionType } from "@/lib/types/database";
import { transactionSchema, type TransactionInput, type TransactionValues } from "@/lib/validation/transactions";
import { createTransactionAction, updateTransactionAction } from "@/lib/actions/transactions";
import { PAYMENT_METHODS, ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";
import { CategorySelector } from "@/components/common/category-selector";
import { ReceiptUploader } from "@/components/transactions/receipt-uploader";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: TransactionType; label: string; className: string }[] = [
  { value: "expense", label: "Expense", className: "data-[active=true]:bg-expense/10 data-[active=true]:text-expense data-[active=true]:border-expense/40" },
  { value: "income", label: "Income", className: "data-[active=true]:bg-income/10 data-[active=true]:text-income data-[active=true]:border-income/40" },
  { value: "transfer", label: "Transfer", className: "data-[active=true]:bg-transfer/10 data-[active=true]:text-transfer data-[active=true]:border-transfer/40" },
];

export interface TransactionFormProps {
  accounts: AccountRow[];
  categories: CategoryRow[];
  goals: SavingsGoalRow[];
  merchants: string[];
  today: string;
  transaction?: TransactionRow | null;
  defaultType?: TransactionType;
  /** Called after a successful save instead of navigating (used by dialogs). */
  onSaved?: (id: string) => void;
  compact?: boolean;
}

function defaultsFrom(tx: TransactionRow | null | undefined, today: string, type: TransactionType): TransactionInput {
  if (!tx) {
    return {
      transactionType: type,
      amount: "",
      transactionDate: today,
      accountId: "",
      toAccountId: "",
      categoryId: "",
      paymentMethod: type === "expense" ? "upi" : "",
      merchant: "",
      note: "",
      isRefund: false,
      savingsGoalId: "",
    };
  }
  return {
    transactionType: tx.transaction_type,
    amount: Number(tx.amount).toFixed(2),
    transactionDate: tx.transaction_date,
    accountId: tx.account_id,
    toAccountId: tx.to_account_id ?? "",
    categoryId: tx.category_id ?? "",
    paymentMethod: tx.payment_method ?? "",
    merchant: tx.merchant ?? "",
    note: tx.note ?? "",
    isRefund: tx.is_refund,
    savingsGoalId: tx.savings_goal_id ?? "",
  };
}

export function TransactionForm({ accounts, categories, goals, merchants, today, transaction, defaultType = "expense", onSaved, compact }: TransactionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [savedId, setSavedId] = React.useState<string | null>(transaction?.id ?? null);
  const [addAnother, setAddAnother] = React.useState(false);
  const activeAccounts = accounts.filter((a) => a.is_active || a.id === transaction?.account_id || a.id === transaction?.to_account_id);

  const form = useForm<TransactionInput, unknown, TransactionValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      ...defaultsFrom(transaction, today, defaultType),
      accountId: transaction?.account_id ?? activeAccounts[0]?.id ?? "",
    },
  });
  const { errors } = form.formState;
  const type = form.watch("transactionType");
  const accountId = form.watch("accountId");
  const isRefund = form.watch("isRefund");

  const setType = (next: TransactionType) => {
    form.setValue("transactionType", next, { shouldDirty: true });
    form.setValue("categoryId", "");
    form.setValue("isRefund", false);
    if (next === "transfer") {
      form.setValue("savingsGoalId", "");
      form.setValue("paymentMethod", "bank_transfer");
    } else {
      form.setValue("toAccountId", "");
      form.setValue("savingsGoalId", "");
    }
    form.clearErrors();
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = transaction ? await updateTransactionAction(transaction.id, values) : await createTransactionAction(values);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof TransactionInput, { message: messages[0] });
          }
        }
        return;
      }
      toast.success(result.message ?? "Saved");
      if (onSaved) {
        onSaved(result.data.id);
        return;
      }
      if (!transaction && addAnother) {
        setSavedId(result.data.id);
        form.reset({ ...defaultsFrom(null, today, values.transactionType), accountId: values.accountId, paymentMethod: values.paymentMethod ?? "" });
        return;
      }
      router.push(transaction ? `/transactions/${transaction.id}` : "/transactions");
      router.refresh();
    });
  });

  const listId = React.useId();

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-3 gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={type === opt.value}
            data-active={type === opt.value}
            onClick={() => setType(opt.value)}
            disabled={pending}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              opt.className
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <FieldGroup>
        <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="amount">Amount</FieldLabel>
            <AmountInput id="amount" aria-invalid={!!errors.amount} autoFocus={!transaction} {...form.register("amount")} />
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.transactionDate}>
            <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
            <Input id="transactionDate" type="date" max="9999-12-31" aria-invalid={!!errors.transactionDate} {...form.register("transactionDate")} />
            <FieldError errors={[errors.transactionDate]} />
          </Field>
        </div>

        {type !== "transfer" ? (
          <Field data-invalid={!!errors.categoryId}>
            <FieldLabel htmlFor="categoryId">Category</FieldLabel>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <CategorySelector id="categoryId" categories={categories} type={type === "income" ? "income" : "expense"} value={field.value || null} onChange={(v) => field.onChange(v ?? "")} invalid={!!errors.categoryId} disabled={pending} />
              )}
            />
            <FieldError errors={[errors.categoryId]} />
          </Field>
        ) : null}

        <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
          <Field data-invalid={!!errors.accountId}>
            <FieldLabel htmlFor="accountId">{type === "transfer" ? "From account" : "Account"}</FieldLabel>
            <NativeSelect id="accountId" aria-invalid={!!errors.accountId} {...form.register("accountId")}>
              <NativeSelectOption value="">Choose an account</NativeSelectOption>
              {activeAccounts.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.name} · {ACCOUNT_TYPE_LABELS[a.account_type]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.accountId]} />
          </Field>
          {type === "transfer" ? (
            <Field data-invalid={!!errors.toAccountId}>
              <FieldLabel htmlFor="toAccountId">To account</FieldLabel>
              <NativeSelect id="toAccountId" aria-invalid={!!errors.toAccountId} {...form.register("toAccountId")}>
                <NativeSelectOption value="">Choose an account</NativeSelectOption>
                {activeAccounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <NativeSelectOption key={a.id} value={a.id}>
                      {a.name} · {ACCOUNT_TYPE_LABELS[a.account_type]}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <FieldError errors={[errors.toAccountId]} />
            </Field>
          ) : (
            <Field data-invalid={!!errors.paymentMethod}>
              <FieldLabel htmlFor="paymentMethod">Payment method</FieldLabel>
              <NativeSelect id="paymentMethod" {...form.register("paymentMethod")}>
                <NativeSelectOption value="">Not specified</NativeSelectOption>
                {PAYMENT_METHODS.map((m) => (
                  <NativeSelectOption key={m.value} value={m.value}>
                    {m.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.paymentMethod]} />
            </Field>
          )}
        </div>

        <Field data-invalid={!!errors.merchant}>
          <FieldLabel htmlFor="merchant">{type === "income" ? "Source / payer" : type === "transfer" ? "Reference" : "Merchant"}</FieldLabel>
          <Input id="merchant" list={listId} autoComplete="off" placeholder={type === "expense" ? "e.g. Big Bazaar" : type === "income" ? "e.g. Acme Pvt Ltd" : "e.g. Monthly savings"} aria-invalid={!!errors.merchant} {...form.register("merchant")} />
          <datalist id={listId}>
            {merchants.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <FieldError errors={[errors.merchant]} />
        </Field>

        {type === "expense" ? (
          <Field orientation="horizontal" data-invalid={!!errors.isRefund}>
            <Controller
              control={form.control}
              name="isRefund"
              render={({ field }) => <Checkbox id="isRefund" checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} disabled={pending} />}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="isRefund">This is a refund</FieldLabel>
              <FieldDescription>A refund reduces spending in this category and returns money to the account.</FieldDescription>
            </div>
          </Field>
        ) : null}

        {type !== "expense" && goals.length > 0 ? (
          <Field data-invalid={!!errors.savingsGoalId}>
            <FieldLabel htmlFor="savingsGoalId">Savings goal (optional)</FieldLabel>
            <NativeSelect id="savingsGoalId" {...form.register("savingsGoalId")}>
              <NativeSelectOption value="">Not linked to a goal</NativeSelectOption>
              {goals.map((g) => (
                <NativeSelectOption key={g.id} value={g.id}>
                  {g.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>Counts this {type} as a contribution toward the goal.</FieldDescription>
            <FieldError errors={[errors.savingsGoalId]} />
          </Field>
        ) : null}

        {!compact ? (
          <Field data-invalid={!!errors.note}>
            <FieldLabel htmlFor="note">Description</FieldLabel>
            <Textarea id="note" rows={2} placeholder="Optional note" aria-invalid={!!errors.note} {...form.register("note")} />
            <FieldError errors={[errors.note]} />
          </Field>
        ) : null}
      </FieldGroup>

      {!compact ? (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium">Receipt</h3>
          {savedId ? (
            <ReceiptUploader transactionId={savedId} receiptPath={transaction?.receipt_path ?? null} />
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Save the transaction first, then attach a receipt image or PDF (up to 5 MB).</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {!transaction && !onSaved ? (
          <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={addAnother} onCheckedChange={(v) => setAddAnother(v === true)} />
            Add another after saving
          </label>
        ) : null}
        <Button type="button" variant="outline" onClick={() => (onSaved ? onSaved("") : router.back())} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {transaction ? "Save changes" : isRefund ? "Save refund" : `Save ${type}`}
        </Button>
      </div>
    </form>
  );
}
