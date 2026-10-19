"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { AccountRow, CategoryRow, RecurringTransactionRow } from "@/lib/types/database";
import { recurringSchema, type RecurringInput } from "@/lib/validation/recurring";
import { createRecurringAction, updateRecurringAction } from "@/lib/actions/recurring";
import { anchorDayFor, upcomingDates } from "@/lib/finance/recurring";
import { isValidDateString } from "@/lib/finance/dates";
import { formatDisplayDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/common/form-select";
import { accountOptions, frequencyOptions, paymentMethodOptions, FormErrorBanner, SegmentedChoice } from "@/components/settings/form-helpers";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, BellRing, Zap } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";
import { CategorySelector } from "@/components/common/category-selector";

type Values = z.output<typeof recurringSchema>;

export function RecurringFormDialog({
  trigger,
  accounts,
  categories,
  schedule,
  today,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  accounts: AccountRow[];
  categories: CategoryRow[];
  schedule?: RecurringTransactionRow | null;
  today: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit schedule" : "New recurring schedule"}</DialogTitle>
          <DialogDescription>Rent, bills, subscriptions, EMIs, salary — generated on schedule, never twice.</DialogDescription>
        </DialogHeader>
        {isOpen ? <RecurringForm accounts={accounts} categories={categories} schedule={schedule ?? null} today={today} close={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RecurringForm({
  accounts,
  categories,
  schedule,
  today,
  close,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  schedule: RecurringTransactionRow | null;
  today: string;
  close: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const active = accounts.filter((a) => a.is_active || a.id === schedule?.account_id || a.id === schedule?.to_account_id);

  const form = useForm<RecurringInput, unknown, Values>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      transactionType: schedule?.transaction_type ?? "expense",
      amount: schedule ? String(schedule.amount) : "",
      accountId: schedule?.account_id ?? active[0]?.id ?? "",
      toAccountId: schedule?.to_account_id ?? "",
      categoryId: schedule?.category_id ?? "",
      frequency: schedule?.frequency ?? "monthly",
      startDate: schedule?.start_date ?? today,
      nextDueDate: schedule?.next_due_date ?? today,
      endDate: schedule?.end_date ?? "",
      merchant: schedule?.merchant ?? "",
      note: schedule?.note ?? "",
      paymentMethod: schedule?.payment_method ?? "",
      postingMode: schedule?.posting_mode ?? "auto_post",
    },
  });

  const type = form.watch("transactionType");
  const frequency = form.watch("frequency");
  const startDate = form.watch("startDate");
  const nextDue = form.watch("nextDueDate");
  const endDate = form.watch("endDate");

  // Keep next due date in sync with start date until the user edits it (new schedules).
  const nextTouched = React.useRef(false);

  const preview = React.useMemo(() => {
    const from = nextDue && isValidDateString(nextDue) ? nextDue : startDate;
    if (!isValidDateString(from) || !isValidDateString(startDate)) return [];
    return upcomingDates(frequency, from, anchorDayFor(startDate), 5, endDate && isValidDateString(endDate) ? endDate : null);
  }, [frequency, startDate, nextDue, endDate]);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    const payload: RecurringInput = {
      ...values,
      toAccountId: values.toAccountId ?? "",
      categoryId: values.categoryId ?? "",
      nextDueDate: values.nextDueDate ?? "",
      endDate: values.endDate ?? "",
      merchant: values.merchant ?? "",
      note: values.note ?? "",
      paymentMethod: values.paymentMethod ?? "",
    };
    startTransition(async () => {
      const r = schedule ? await updateRecurringAction(schedule.id, payload) : await createRecurringAction(payload);
      if (r.ok) {
        toast.success(r.message ?? "Saved");
        close();
      } else {
        setFormError(r.error);
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) form.setError(k as keyof RecurringInput, { message: v[0] });
      }
    });
  });

  const errors = form.formState.errors;
  const accountOpts = accountOptions(active);
  const monthEndNote = isValidDateString(startDate) && anchorDayFor(startDate) > 28 && (frequency === "monthly" || frequency === "yearly");

  return (
        <form onSubmit={onSubmit} noValidate aria-busy={pending}>
          <FieldGroup className="gap-5">
            <FormErrorBanner message={formError} />
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Controller
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <SegmentedChoice
                    idPrefix="rt-type"
                    aria-label="Transaction type"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "expense", label: "Expense", icon: <ArrowDownRight />, activeClassName: "border-expense bg-expense/10 text-expense" },
                      { value: "income", label: "Income", icon: <ArrowUpRight />, activeClassName: "border-income bg-income/10 text-income" },
                      { value: "transfer", label: "Transfer", icon: <ArrowLeftRight />, activeClassName: "border-transfer bg-transfer/10 text-transfer" },
                    ]}
                  />
                )}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="rt-amount">Amount</FieldLabel>
                <AmountInput id="rt-amount" className="h-12 text-xl font-semibold" aria-invalid={!!errors.amount} {...form.register("amount")} />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field data-invalid={!!errors.frequency}>
                <FieldLabel htmlFor="rt-frequency">Frequency</FieldLabel>
                <Controller
                  control={form.control}
                  name="frequency"
                  render={({ field }) => <FormSelect id="rt-frequency" value={field.value} onValueChange={field.onChange} invalid={!!errors.frequency} options={frequencyOptions()} className="h-12" />}
                />
                <FieldError errors={[errors.frequency]} />
              </Field>
            </div>
            <div className={type === "transfer" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
              <Field data-invalid={!!errors.accountId}>
                <FieldLabel htmlFor="rt-account">{type === "transfer" ? "From account" : "Account"}</FieldLabel>
                <Controller
                  control={form.control}
                  name="accountId"
                  render={({ field }) => <FormSelect id="rt-account" value={field.value} onValueChange={field.onChange} invalid={!!errors.accountId} options={accountOpts} placeholder="Choose an account" />}
                />
                <FieldError errors={[errors.accountId]} />
              </Field>
              {type === "transfer" ? (
                <Field data-invalid={!!errors.toAccountId}>
                  <FieldLabel htmlFor="rt-to">To account</FieldLabel>
                  <Controller
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormSelect id="rt-to" value={field.value ?? ""} onValueChange={field.onChange} invalid={!!errors.toAccountId} options={accountOpts.filter((o) => o.value !== form.watch("accountId"))} placeholder="Choose the destination" />
                    )}
                  />
                  <FieldError errors={[errors.toAccountId]} />
                </Field>
              ) : null}
            </div>
            {type === "transfer" ? null : (
              <Field data-invalid={!!errors.categoryId}>
                <FieldLabel htmlFor="rt-category">Category</FieldLabel>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <CategorySelector id="rt-category" categories={categories} type={type === "income" ? "income" : "expense"} value={field.value || null} onChange={(id) => field.onChange(id ?? "")} invalid={!!errors.categoryId} />
                  )}
                />
                <FieldError errors={[errors.categoryId]} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field data-invalid={!!errors.startDate}>
                <FieldLabel htmlFor="rt-start">Start date</FieldLabel>
                <Input
                  id="rt-start"
                  type="date"
                  max="9999-12-31"
                  aria-invalid={!!errors.startDate}
                  {...form.register("startDate", {
                    onChange: (e) => {
                      const v = (e.target as HTMLInputElement).value;
                      if (!schedule && !nextTouched.current && isValidDateString(v)) form.setValue("nextDueDate", v);
                    },
                  })}
                />
                <FieldError errors={[errors.startDate]} />
              </Field>
              <Field data-invalid={!!errors.nextDueDate}>
                <FieldLabel htmlFor="rt-next">Next due</FieldLabel>
                <Input
                  id="rt-next"
                  type="date"
                  max="9999-12-31"
                  aria-invalid={!!errors.nextDueDate}
                  {...form.register("nextDueDate", { onChange: () => (nextTouched.current = true) })}
                />
                <FieldError errors={[errors.nextDueDate]} />
              </Field>
              <Field data-invalid={!!errors.endDate} className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor="rt-end">End date (optional)</FieldLabel>
                <Input id="rt-end" type="date" max="9999-12-31" aria-invalid={!!errors.endDate} {...form.register("endDate")} />
                <FieldError errors={[errors.endDate]} />
              </Field>
            </div>
            {preview.length > 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/40 px-3 py-2.5 text-xs">
                <span className="font-medium">Upcoming dates:</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {preview.map((d) => (
                    <span key={d} className="rounded-md bg-background px-2 py-0.5 tabular ring-1 ring-foreground/10">
                      {formatDisplayDate(d)}
                    </span>
                  ))}
                </span>
                {monthEndNote ? <span className="mt-1 block text-muted-foreground">Months without day {anchorDayFor(startDate)} use their last day.</span> : null}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.merchant}>
                <FieldLabel htmlFor="rt-merchant">Merchant / payee</FieldLabel>
                <Input id="rt-merchant" placeholder="Landlord, Airtel…" aria-invalid={!!errors.merchant} {...form.register("merchant")} />
                <FieldError errors={[errors.merchant]} />
              </Field>
              <Field data-invalid={!!errors.paymentMethod}>
                <FieldLabel htmlFor="rt-method">Payment method</FieldLabel>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => <FormSelect id="rt-method" value={field.value ?? ""} onValueChange={field.onChange} invalid={!!errors.paymentMethod} options={paymentMethodOptions()} emptyLabel="Not set" placeholder="Not set" />}
                />
                <FieldError errors={[errors.paymentMethod]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.note}>
              <FieldLabel htmlFor="rt-note">Note (optional)</FieldLabel>
              <Textarea id="rt-note" rows={2} aria-invalid={!!errors.note} {...form.register("note")} />
              <FieldError errors={[errors.note]} />
            </Field>
            <Field>
              <FieldLabel>When an occurrence is due</FieldLabel>
              <Controller
                control={form.control}
                name="postingMode"
                render={({ field }) => (
                  <SegmentedChoice
                    idPrefix="rt-mode"
                    aria-label="Posting mode"
                    columns={1}
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "auto_post", label: "Auto-post", description: "Creates the transaction automatically on the due date.", icon: <Zap /> },
                      { value: "reminder", label: "Reminder", description: "Sends a notification and asks you to confirm or skip each occurrence.", icon: <BellRing /> },
                    ]}
                  />
                )}
              />
              <FieldDescription>Due occurrences are generated by the daily scheduler or when you press “Process due now”.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {schedule ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </form>
  );
}
