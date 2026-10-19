"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { AccountRow } from "@/lib/types/database";
import { accountSchema, type AccountInput } from "@/lib/validation/accounts";
import { createAccountAction, updateAccountAction } from "@/lib/actions/accounts";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSelect } from "@/components/common/form-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { accountTypeOptions } from "@/components/transactions/select-options";
import { Spinner } from "@/components/ui/spinner";
import { AmountInput } from "@/components/common/amount-input";

type AccountValues = ReturnType<typeof accountSchema.parse>;

export function AccountFormDialog({ account, trigger }: { account?: AccountRow | null; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const defaults: AccountInput = {
    name: account?.name ?? "",
    accountType: account?.account_type ?? "bank",
    openingBalance: account ? Number(account.opening_balance).toFixed(2) : "0",
    isActive: account?.is_active ?? true,
  };
  const form = useForm<AccountInput, unknown, AccountValues>({ mode: "onTouched", reValidateMode: "onChange", resolver: zodResolver(accountSchema), defaultValues: defaults });
  const { errors } = form.formState;
  const accountType = form.watch("accountType");
  const typeInfo = ACCOUNT_TYPES.find((t) => t.value === accountType);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const r = account ? await updateAccountAction(account.id, values) : await createAccountAction(values);
      if (!r.ok) {
        setFormError(r.error);
        if (r.fieldErrors) for (const [f, m] of Object.entries(r.fieldErrors)) form.setError(f as keyof AccountInput, { message: m[0] });
        return;
      }
      toast.success(r.message ?? "Saved");
      setOpen(false);
      form.reset(defaults);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { form.reset(defaults); setFormError(null); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>Accounts hold your money. Balances are calculated from the opening balance and every transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-5">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-5">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="acc-name">Name</FieldLabel>
              <Input id="acc-name" autoFocus placeholder="e.g. HDFC Salary" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.accountType}>
              <FieldLabel htmlFor="acc-type">Type</FieldLabel>
              <Controller
                control={form.control}
                name="accountType"
                render={({ field }) => <FormSelect id="acc-type" value={field.value} onValueChange={field.onChange} invalid={!!errors.accountType} options={accountTypeOptions(ACCOUNT_TYPES)} />}
              />
              {typeInfo ? <FieldDescription>{typeInfo.description}</FieldDescription> : null}
              <FieldError errors={[errors.accountType]} />
            </Field>
            <Field data-invalid={!!errors.openingBalance}>
              <FieldLabel htmlFor="acc-opening">Opening balance</FieldLabel>
              <AmountInput id="acc-opening" aria-invalid={!!errors.openingBalance} {...form.register("openingBalance")} />
              <FieldDescription>{accountType === "credit_card" ? "Enter a negative amount for an existing outstanding balance." : "The balance before any transaction recorded here."}</FieldDescription>
              <FieldError errors={[errors.openingBalance]} />
            </Field>
            <Field orientation="horizontal" className="rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-1 flex-col gap-0.5">
                <FieldLabel htmlFor="acc-active">Active</FieldLabel>
                <FieldDescription>Inactive accounts are hidden from forms but keep their history.</FieldDescription>
              </div>
              <Controller control={form.control} name="isActive" render={({ field }) => <Switch id="acc-active" checked={!!field.value} onCheckedChange={field.onChange} />} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {account ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
