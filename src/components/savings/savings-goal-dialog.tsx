"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { AccountRow, SavingsGoalRow } from "@/lib/types/database";
import { savingsGoalSchema, type SavingsGoalInput } from "@/lib/validation/savings";
import { createSavingsGoalAction, updateSavingsGoalAction } from "@/lib/actions/savings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";

type Values = z.output<typeof savingsGoalSchema>;

export function SavingsGoalDialog({
  trigger,
  accounts,
  goal,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  accounts: AccountRow[];
  goal?: SavingsGoalRow | null;
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
          <DialogTitle>{goal ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>Progress is the sum of transfers you tag with this goal — not your account balance.</DialogDescription>
        </DialogHeader>
        {isOpen ? <GoalForm accounts={accounts} goal={goal ?? null} close={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ accounts, goal, close }: { accounts: AccountRow[]; goal: SavingsGoalRow | null; close: () => void }) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<SavingsGoalInput, unknown, Values>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      name: goal?.name ?? "",
      targetAmount: goal ? String(goal.target_amount) : "",
      targetDate: goal?.target_date ?? "",
      description: goal?.description ?? "",
      accountId: goal?.account_id ?? "",
      status: goal?.status ?? "active",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    const payload: SavingsGoalInput = {
      ...values,
      targetDate: values.targetDate ?? "",
      description: values.description ?? "",
      accountId: values.accountId ?? "",
    };
    startTransition(async () => {
      const r = goal ? await updateSavingsGoalAction(goal.id, payload) : await createSavingsGoalAction(payload);
      if (r.ok) {
        toast.success(r.message ?? "Saved");
        close();
      } else {
        setFormError(r.error);
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) form.setError(k as keyof SavingsGoalInput, { message: v[0] });
      }
    });
  });

  const errors = form.formState.errors;
  const savingsAccounts = accounts.filter((a) => a.is_active);

  return (
        <form onSubmit={onSubmit} noValidate aria-busy={pending}>
          <FieldGroup>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="goal-name">Goal name</FieldLabel>
              <Input id="goal-name" placeholder="Emergency fund" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.targetAmount}>
                <FieldLabel htmlFor="goal-target">Target amount</FieldLabel>
                <AmountInput id="goal-target" aria-invalid={!!errors.targetAmount} {...form.register("targetAmount")} />
                <FieldError errors={[errors.targetAmount]} />
              </Field>
              <Field data-invalid={!!errors.targetDate}>
                <FieldLabel htmlFor="goal-date">Target date (optional)</FieldLabel>
                <Input id="goal-date" type="date" max="9999-12-31" aria-invalid={!!errors.targetDate} {...form.register("targetDate")} />
                <FieldError errors={[errors.targetDate]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.accountId}>
              <FieldLabel htmlFor="goal-account">Linked account (optional)</FieldLabel>
              <NativeSelect id="goal-account" aria-invalid={!!errors.accountId} {...form.register("accountId")}>
                <NativeSelectOption value="">No linked account</NativeSelectOption>
                {savingsAccounts.map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name} · {ACCOUNT_TYPE_LABELS[a.account_type]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Transfers out of the linked account tagged with this goal count as withdrawals.</FieldDescription>
              <FieldError errors={[errors.accountId]} />
            </Field>
            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="goal-desc">Notes (optional)</FieldLabel>
              <Textarea id="goal-desc" rows={2} aria-invalid={!!errors.description} {...form.register("description")} />
              <FieldError errors={[errors.description]} />
            </Field>
            {goal ? (
              <Field>
                <FieldLabel htmlFor="goal-status">Status</FieldLabel>
                <NativeSelect id="goal-status" {...form.register("status")}>
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                  <NativeSelectOption value="completed">Completed</NativeSelectOption>
                  <NativeSelectOption value="archived">Archived</NativeSelectOption>
                </NativeSelect>
              </Field>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
  );
}
