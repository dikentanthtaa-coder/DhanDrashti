"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Paperclip, RotateCcw, Target } from "lucide-react";
import type { AccountRow, CategoryRow, SavingsGoalRow, TransactionRow, TransactionType } from "@/lib/types/database";
import { transactionSchema, type TransactionInput, type TransactionValues } from "@/lib/validation/transactions";
import { createTransactionAction, updateTransactionAction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";
import { CategorySelector } from "@/components/common/category-selector";
import { FormSelect } from "@/components/common/form-select";
import { ReceiptUploader } from "@/components/transactions/receipt-uploader";
import { accountOptions, paymentMethodOptions } from "@/components/transactions/select-options";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: TransactionType; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; className: string }[] = [
  {
    value: "expense",
    label: "Expense",
    hint: "Money going out",
    icon: ArrowDownRight,
    className: "data-[active=true]:border-expense/50 data-[active=true]:bg-expense/10 data-[active=true]:text-expense",
  },
  {
    value: "income",
    label: "Income",
    hint: "Money coming in",
    icon: ArrowUpRight,
    className: "data-[active=true]:border-income/50 data-[active=true]:bg-income/10 data-[active=true]:text-income",
  },
  {
    value: "transfer",
    label: "Transfer",
    hint: "Between your accounts",
    icon: ArrowLeftRight,
    className: "data-[active=true]:border-transfer/50 data-[active=true]:bg-transfer/10 data-[active=true]:text-transfer",
  },
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
  const accountOpts = React.useMemo(() => accountOptions(activeAccounts), [activeAccounts]);
  const toAccountOpts = React.useMemo(() => accountOptions(activeAccounts.filter((a) => a.id !== accountId)), [activeAccounts, accountId]);
  const methodOpts = React.useMemo(() => paymentMethodOptions(), []);
  const goalOpts = React.useMemo(() => goals.map((g) => ({ value: g.id, label: g.name, icon: <Target className="text-muted-foreground" /> })), [goals]);

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-1.5">
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
              "flex flex-col items-center gap-0.5 rounded-lg border border-transparent px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-background/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:justify-center sm:gap-2",
              "data-[active=true]:bg-background data-[active=true]:shadow-xs",
              opt.className
            )}
          >
            <opt.icon className="size-4" aria-hidden="true" />
            <span>{opt.label}</span>
            <span className="hidden text-xs font-normal text-muted-foreground lg:inline">· {opt.hint}</span>
          </button>
        ))}
      </div>

      <FieldGroup className="gap-5">
        <div className={cn("grid gap-5", !compact && "sm:grid-cols-[1.4fr_1fr]")}>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="amount">Amount</FieldLabel>
            <AmountInput
              id="amount"
              aria-invalid={!!errors.amount}
              autoFocus={!transaction}
              className={cn("h-12 text-2xl font-semibold", type === "expense" && !isRefund ? "text-expense" : type === "income" || isRefund ? "text-income" : "text-transfer")}
              {...form.register("amount")}
            />
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.transactionDate}>
            <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
            <Input id="transactionDate" type="date" max="9999-12-31" className="h-12" aria-invalid={!!errors.transactionDate} {...form.register("transactionDate")} />
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
                <CategorySelector
                  id="categoryId"
                  categories={categories}
                  type={type === "income" ? "income" : "expense"}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  invalid={!!errors.categoryId}
                  disabled={pending}
                />
              )}
            />
            <FieldError errors={[errors.categoryId]} />
          </Field>
        ) : null}

        <div className={cn("grid gap-5", !compact && "sm:grid-cols-2")}>
          <Field data-invalid={!!errors.accountId}>
            <FieldLabel htmlFor="accountId">{type === "transfer" ? "From account" : "Account"}</FieldLabel>
            <Controller
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormSelect id="accountId" value={field.value} onValueChange={field.onChange} invalid={!!errors.accountId} disabled={pending} options={accountOpts} placeholder="Choose an account" />
              )}
            />
            <FieldError errors={[errors.accountId]} />
          </Field>
          {type === "transfer" ? (
            <Field data-invalid={!!errors.toAccountId}>
              <FieldLabel htmlFor="toAccountId">To account</FieldLabel>
              <Controller
                control={form.control}
                name="toAccountId"
                render={({ field }) => (
                  <FormSelect id="toAccountId" value={field.value ?? ""} onValueChange={field.onChange} invalid={!!errors.toAccountId} disabled={pending} options={toAccountOpts} placeholder="Choose an account" />
                )}
              />
              <FieldError errors={[errors.toAccountId]} />
            </Field>
          ) : (
            <Field data-invalid={!!errors.paymentMethod}>
              <FieldLabel htmlFor="paymentMethod">Payment method</FieldLabel>
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormSelect id="paymentMethod" value={field.value ?? ""} onValueChange={field.onChange} disabled={pending} options={methodOpts} emptyLabel="Not specified" placeholder="Not specified" />
                )}
              />
              <FieldError errors={[errors.paymentMethod]} />
            </Field>
          )}
        </div>

        <Field data-invalid={!!errors.merchant}>
          <FieldLabel htmlFor="merchant">{type === "income" ? "Source / payer" : type === "transfer" ? "Reference" : "Merchant"}</FieldLabel>
          <Input
            id="merchant"
            list={listId}
            autoComplete="off"
            placeholder={type === "expense" ? "e.g. Big Bazaar" : type === "income" ? "e.g. Acme Pvt Ltd" : "e.g. Monthly savings"}
            aria-invalid={!!errors.merchant}
            {...form.register("merchant")}
          />
          <datalist id={listId}>
            {merchants.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <FieldError errors={[errors.merchant]} />
        </Field>

        {type === "expense" ? (
          <Field data-invalid={!!errors.isRefund} className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Controller
                control={form.control}
                name="isRefund"
                render={({ field }) => <Checkbox id="isRefund" className="mt-0.5" checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} disabled={pending} />}
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="isRefund" className="flex items-center gap-1.5">
                  <RotateCcw className="size-3.5 text-muted-foreground" aria-hidden="true" /> This is a refund
                </FieldLabel>
                <FieldDescription>A refund reduces spending in this category and returns money to the account.</FieldDescription>
              </div>
            </div>
          </Field>
        ) : null}

        {type !== "expense" && goals.length > 0 ? (
          <Field data-invalid={!!errors.savingsGoalId}>
            <FieldLabel htmlFor="savingsGoalId">Savings goal (optional)</FieldLabel>
            <Controller
              control={form.control}
              name="savingsGoalId"
              render={({ field }) => (
                <FormSelect id="savingsGoalId" value={field.value ?? ""} onValueChange={field.onChange} disabled={pending} options={goalOpts} emptyLabel="Not linked to a goal" placeholder="Not linked to a goal" />
              )}
            />
            <FieldDescription>Counts this {type} as a contribution toward the goal.</FieldDescription>
            <FieldError errors={[errors.savingsGoalId]} />
          </Field>
        ) : null}

        {!compact ? (
          <Field data-invalid={!!errors.note}>
            <FieldLabel htmlFor="note">Description</FieldLabel>
            <Textarea id="note" rows={2} placeholder="Optional note — what was this for?" aria-invalid={!!errors.note} {...form.register("note")} />
            <FieldError errors={[errors.note]} />
          </Field>
        ) : null}
      </FieldGroup>

      {!compact ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" /> Receipt
          </h3>
          {savedId ? (
            <ReceiptUploader transactionId={savedId} receiptPath={transaction?.receipt_path ?? null} />
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Save the transaction first, then attach a receipt image or PDF (up to 5 MB).</p>
          )}
        </div>
      ) : null}

      <div className="sticky bottom-20 z-10 -mx-4 flex flex-col-reverse gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none lg:bottom-0">
        {!transaction && !onSaved ? (
          <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={addAnother} onCheckedChange={(v) => setAddAnother(v === true)} />
            Add another after saving
          </label>
        ) : null}
        <Button type="button" variant="outline" onClick={() => (onSaved ? onSaved("") : router.back())} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-w-36">
          {pending ? <Spinner /> : null}
          {transaction ? "Save changes" : isRefund ? "Save refund" : `Save ${type}`}
        </Button>
      </div>
    </form>
  );
}
