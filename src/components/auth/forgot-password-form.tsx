"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

type Values = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const r = await forgotPasswordAction(values);
      setMessage(r.ok ? { kind: "ok", text: r.message ?? "Check your inbox." } : { kind: "error", text: r.error });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending}>
      <FieldGroup>
        {message ? (
          <Alert variant={message.kind === "error" ? "destructive" : "default"} role="status">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : null}
          Send reset link
        </Button>
      </FieldGroup>
    </form>
  );
}
