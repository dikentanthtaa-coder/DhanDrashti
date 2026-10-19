"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { changePasswordSchema } from "@/lib/validation/auth";
import { changePasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/auth/password-input";

type Values = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [pending, startTransition] = React.useTransition();
  const form = useForm<Values>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", password: "", confirmPassword: "" } });
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const r = await changePasswordAction(values);
      if (r.ok) {
        toast.success(r.message ?? "Password updated");
        form.reset();
      } else {
        toast.error(r.error);
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) form.setError(k as keyof Values, { message: v[0] });
      }
    });
  });
  const errors = form.formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="max-w-lg">
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.currentPassword}>
          <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
          <PasswordInput id="currentPassword" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...form.register("currentPassword")} />
          <FieldError errors={[errors.currentPassword]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="newPassword">New password</FieldLabel>
          <PasswordInput id="newPassword" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          <FieldDescription>At least 10 characters with a letter and a number.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmNewPassword">Confirm new password</FieldLabel>
          <PasswordInput id="confirmNewPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Update password
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
