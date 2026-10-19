"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteAccountSchema } from "@/lib/validation/auth";
import { deleteAccountAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/auth/password-input";

type Values = z.infer<typeof deleteAccountSchema>;

export function DeleteAccountDialog({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const form = useForm<Values>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { confirmation: "" as "DELETE", password: "" } });
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const r = await deleteAccountAction(values);
      if (r && !r.ok) {
        toast.error(r.error);
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) form.setError(k as keyof Values, { message: v[0] });
      }
    });
  });
  const errors = form.formState.errors;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={!enabled}>
          <Trash2 data-icon="inline-start" /> Delete my account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete your account permanently?</DialogTitle>
          <DialogDescription>
            This removes your profile, accounts, transactions, receipts, budgets, savings goals, recurring schedules and notifications. It
            cannot be undone. Export a CSV from Reports first if you want a copy.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate aria-busy={pending}>
          <FieldGroup className="gap-5">
            <Field data-invalid={!!errors.confirmation}>
              <FieldLabel htmlFor="delete-confirm">
                Type <span className="font-mono">DELETE</span> to confirm
              </FieldLabel>
              <Input id="delete-confirm" autoComplete="off" aria-invalid={!!errors.confirmation} {...form.register("confirmation")} />
              <FieldError errors={[errors.confirmation]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="delete-password">Your password</FieldLabel>
              <PasswordInput id="delete-password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register("password")} />
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep my account
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Spinner /> : null}
              Delete everything
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
