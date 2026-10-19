"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Spinner } from "@/components/ui/spinner";

type Values = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values>({ mode: "onTouched", reValidateMode: "onChange", resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const r = await resetPasswordAction(values);
      if (r && !r.ok) setError(r.error);
    });
  });

  const errors = form.formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending}>
      <FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          <FieldDescription>At least 10 characters with a letter and a number.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : null}
          Update password
        </Button>
      </FieldGroup>
    </form>
  );
}
