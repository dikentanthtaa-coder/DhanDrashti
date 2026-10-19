"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { resendVerificationAction, signUpAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useRetryCountdown } from "@/hooks/use-retry-countdown";
import { RetryNotice } from "@/components/auth/retry-notice";

export function SignupForm() {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const retry = useRetryCountdown("signup");
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result) return;
      if (result.ok) {
        setSentTo(values.email);
      } else {
        setFormError(result.error);
        if (result.retryAfterSeconds) retry.start(result.retryAfterSeconds);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof SignupInput, { message: messages[0] });
          }
        }
      }
    });
  });

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <MailCheck className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h2 className="font-semibold">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          If <span className="font-medium text-foreground">{sentTo}</span> can be registered, we sent a verification link.
          Open it to activate your account.
        </p>
        {retry.active ? <RetryNotice message="Email limit reached." remaining={retry.remaining} /> : null}
        <Button
          variant="outline"
          size="sm"
          disabled={pending || retry.active}
          onClick={() =>
            startTransition(async () => {
              const r = await resendVerificationAction({ email: sentTo });
              if (!r.ok && r.retryAfterSeconds) retry.start(r.retryAfterSeconds);
              toast(r.ok ? r.message ?? "Sent" : r.error);
            })
          }
        >
          Resend link
        </Button>
      </div>
    );
  }

  const errors = form.formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending}>
      <FieldGroup>
        {retry.active ? (
          <RetryNotice message={formError ?? "Too many attempts."} remaining={retry.remaining} />
        ) : formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={!!errors.displayName}>
          <FieldLabel htmlFor="displayName">Your name</FieldLabel>
          <Input id="displayName" autoComplete="name" aria-invalid={!!errors.displayName} {...form.register("displayName")} />
          <FieldError errors={[errors.displayName]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          <FieldDescription>At least 10 characters with a letter and a number.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...form.register("confirmPassword")} />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending || retry.active}>
          {pending ? <Spinner /> : null}
          {retry.active ? "Please wait…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
