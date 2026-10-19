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
import { ACCOUNT_TYPE_LABELS, FREQUENCIES, PAYMENT_METHODS, TRANSACTION_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  const monthEndNote = isValidDateString(startDate) && anchorDayFor(startDate) > 28 && (frequency === "monthly" || frequency === "yearly");

  return (
        <form onSubmit={onSubmit} noValidate aria-busy={pending}>
          <FieldGroup>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Controller
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-3 gap-2">
                    {TRANSACTION_TYPES.map((t) => (
                      <Label key={t.value} htmlFor={`rt-type-${t.value}`} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10">
                        <RadioGroupItem id={`rt-type-${t.value}`} value={t.value} />
                        {t.label}
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="rt-amount">Amount</FieldLabel>
                <AmountInput id="rt-amount" aria-invalid={!!errors.amount} {...form.register("amount")} />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field data-invalid={!!errors.frequency}>
                <FieldLabel htmlFor="rt-frequency">Frequency</FieldLabel>
                <NativeSelect id="rt-frequency" {...form.register("frequency")}>
                  {FREQUENCIES.map((f) => (
                    <NativeSelectOption key={f.value} value={f.value}>
                      {f.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.frequency]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.accountId}>
              <FieldLabel htmlFor="rt-account">{type === "transfer" ? "From account" : "Account"}</FieldLabel>
              <NativeSelect id="rt-account" aria-invalid={!!errors.accountId} {...form.register("accountId")}>
                {active.map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name} · {ACCOUNT_TYPE_LABELS[a.account_type]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.accountId]} />
            </Field>
            {type === "transfer" ? (
              <Field data-invalid={!!errors.toAccountId}>
                <FieldLabel htmlFor="rt-to">To account</FieldLabel>
                <NativeSelect id="rt-to" aria-invalid={!!errors.toAccountId} {...form.register("toAccountId")}>
                  <NativeSelectOption value="">Choose…</NativeSelectOption>
                  {active.map((a) => (
                    <NativeSelectOption key={a.id} value={a.id}>
                      {a.name} · {ACCOUNT_TYPE_LABELS[a.account_type]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.toAccountId]} />
              </Field>
            ) : (
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs">
                <span className="font-medium">Upcoming:</span> {preview.map((d) => formatDisplayDate(d)).join(" · ")}
                {monthEndNote ? <span className="block text-muted-foreground">Months without day {anchorDayFor(startDate)} use their last day.</span> : null}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.merchant}>
                <FieldLabel htmlFor="rt-merchant">Merchant / payee</FieldLabel>
                <Input id="rt-merchant" placeholder="Landlord, Airtel…" aria-invalid={!!errors.merchant} {...form.register("merchant")} />
                <FieldError errors={[errors.merchant]} />
              </Field>
              <Field data-invalid={!!errors.paymentMethod}>
                <FieldLabel htmlFor="rt-method">Payment method</FieldLabel>
                <NativeSelect id="rt-method" {...form.register("paymentMethod")}>
                  <NativeSelectOption value="">Not set</NativeSelectOption>
                  {PAYMENT_METHODS.map((m) => (
                    <NativeSelectOption key={m.value} value={m.value}>
                      {m.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                    <Label htmlFor="rt-mode-auto" className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10">
                      <RadioGroupItem id="rt-mode-auto" value="auto_post" className="mt-0.5" />
                      <span>
                        <span className="font-medium">Auto-post</span>
                        <span className="block text-xs text-muted-foreground">Creates the transaction automatically on the due date.</span>
                      </span>
                    </Label>
                    <Label htmlFor="rt-mode-reminder" className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10">
                      <RadioGroupItem id="rt-mode-reminder" value="reminder" className="mt-0.5" />
                      <span>
                        <span className="font-medium">Reminder</span>
                        <span className="block text-xs text-muted-foreground">Sends a notification and asks you to confirm or skip each occurrence.</span>
                      </span>
                    </Label>
                  </RadioGroup>
                )}
              />
              <FieldDescription>Due occurrences are generated by the daily scheduler or when you press “Process due now”.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
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
