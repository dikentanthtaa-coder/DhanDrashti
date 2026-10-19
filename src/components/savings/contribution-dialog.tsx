"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { AccountRow, SavingsGoalRow } from "@/lib/types/database";
import { contributionSchema } from "@/lib/validation/savings";
import { addContributionAction } from "@/lib/actions/savings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/common/form-select";
import { accountOptions, FormErrorBanner } from "@/components/settings/form-helpers";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";

type Input = z.input<typeof contributionSchema>;
type Values = z.output<typeof contributionSchema>;

export function ContributionDialog({
  goal,
  accounts,
  today,
  open,
  onOpenChange,
}: {
  goal: SavingsGoalRow;
  accounts: AccountRow[];
  today: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add contribution to “{goal.name}”</DialogTitle>
          <DialogDescription>Recorded as a transfer between your own accounts. It is never counted as an expense.</DialogDescription>
        </DialogHeader>
        {open ? <ContributionForm goal={goal} accounts={accounts} today={today} close={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ContributionForm({ goal, accounts, today, close }: { goal: SavingsGoalRow; accounts: AccountRow[]; today: string; close: () => void }) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const active = accounts.filter((a) => a.is_active);
  const defaultFrom = active.find((a) => a.account_type === "bank")?.id ?? active[0]?.id ?? "";
  const defaultTo = goal.account_id ?? active.find((a) => a.account_type === "savings" && a.id !== defaultFrom)?.id ?? active.find((a) => a.id !== defaultFrom)?.id ?? "";

  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { goalId: goal.id, amount: "", transactionDate: today, fromAccountId: defaultFrom, toAccountId: defaultTo, note: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const r = await addContributionAction({ ...values, note: values.note ?? "" });
      if (r.ok) {
        toast.success(r.message ?? "Contribution recorded");
        close();
      } else {
        setFormError(r.error);
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) form.setError(k as keyof Input, { message: v[0] });
      }
    });
  });

  const errors = form.formState.errors;
  const accountOpts = accountOptions(active);
  const fromId = form.watch("fromAccountId");
  const toId = form.watch("toAccountId");
  return (
        <form onSubmit={onSubmit} noValidate aria-busy={pending}>
          <FieldGroup className="gap-5">
            <FormErrorBanner message={formError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="contrib-amount">Amount</FieldLabel>
                <AmountInput id="contrib-amount" autoFocus className="h-12 text-xl font-semibold" aria-invalid={!!errors.amount} {...form.register("amount")} />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field data-invalid={!!errors.transactionDate}>
                <FieldLabel htmlFor="contrib-date">Date</FieldLabel>
                <Input id="contrib-date" type="date" max="9999-12-31" aria-invalid={!!errors.transactionDate} {...form.register("transactionDate")} />
                <FieldError errors={[errors.transactionDate]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.fromAccountId}>
              <FieldLabel htmlFor="contrib-from">From account</FieldLabel>
              <Controller
                control={form.control}
                name="fromAccountId"
                render={({ field }) => <FormSelect id="contrib-from" value={field.value} onValueChange={field.onChange} invalid={!!errors.fromAccountId} options={accountOpts.filter((o) => o.value !== toId)} placeholder="Choose the source account" />}
              />
              <FieldError errors={[errors.fromAccountId]} />
            </Field>
            <Field data-invalid={!!errors.toAccountId}>
              <FieldLabel htmlFor="contrib-to">To account</FieldLabel>
              <Controller
                control={form.control}
                name="toAccountId"
                render={({ field }) => <FormSelect id="contrib-to" value={field.value} onValueChange={field.onChange} invalid={!!errors.toAccountId} options={accountOpts.filter((o) => o.value !== fromId)} placeholder="Choose the savings account" />}
              />
              <FieldDescription>{goal.account_id ? "Defaults to the goal's linked account." : "Usually a savings account."}</FieldDescription>
              <FieldError errors={[errors.toAccountId]} />
            </Field>
            <Field data-invalid={!!errors.note}>
              <FieldLabel htmlFor="contrib-note">Note (optional)</FieldLabel>
              <Input id="contrib-note" aria-invalid={!!errors.note} {...form.register("note")} />
              <FieldError errors={[errors.note]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || active.length < 2}>
              {pending ? <Spinner /> : null}
              Record contribution
            </Button>
          </DialogFooter>
          {active.length < 2 ? <p className="mt-2 text-xs text-muted-foreground">You need at least two active accounts to record a transfer.</p> : null}
        </form>
  );
}
