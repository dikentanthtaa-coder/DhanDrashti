"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { profileSchema } from "@/lib/validation/auth";
import { updateProfileAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

type Values = z.infer<typeof profileSchema>;

export function ProfileForm({
  displayName,
  timezone,
  emailAlertsEnabled,
  emailConfigured,
  timezones,
}: {
  displayName: string;
  timezone: string;
  emailAlertsEnabled: boolean;
  emailConfigured: boolean;
  timezones: string[];
}) {
  const [pending, startTransition] = React.useTransition();
  const form = useForm<Values>({ resolver: zodResolver(profileSchema), defaultValues: { displayName, timezone, emailAlertsEnabled } });
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const r = await updateProfileAction(values);
      if (r.ok) toast.success(r.message ?? "Saved");
      else {
        toast.error(r.error);
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) form.setError(k as keyof Values, { message: v[0] });
      }
    });
  });
  const errors = form.formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="max-w-lg">
      <FieldGroup>
        <Field data-invalid={!!errors.displayName}>
          <FieldLabel htmlFor="displayName">Display name</FieldLabel>
          <Input id="displayName" autoComplete="name" aria-invalid={!!errors.displayName} {...form.register("displayName")} />
          <FieldError errors={[errors.displayName]} />
        </Field>
        <Field data-invalid={!!errors.timezone}>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <NativeSelect id="timezone" aria-invalid={!!errors.timezone} {...form.register("timezone")}>
            {timezones.map((tz) => (
              <NativeSelectOption key={tz} value={tz}>
                {tz}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Determines what “today” and “this month” mean for your dashboard, budgets and schedules.</FieldDescription>
          <FieldError errors={[errors.timezone]} />
        </Field>
        <Field>
          <FieldLabel>Currency</FieldLabel>
          <Input value="INR (₹)" readOnly aria-readonly />
          <FieldDescription>Indian Rupee with Indian digit grouping (₹1,25,000.00).</FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Controller
            control={form.control}
            name="emailAlertsEnabled"
            render={({ field }) => <Switch id="emailAlerts" checked={field.value} onCheckedChange={field.onChange} disabled={!emailConfigured} />}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="emailAlerts">Email me budget alerts</FieldLabel>
            <FieldDescription>
              {emailConfigured
                ? "Threshold alerts are also sent to your account email."
                : "Email delivery is not configured on this deployment (RESEND_API_KEY and EMAIL_FROM). In-app alerts still work."}
            </FieldDescription>
          </div>
        </Field>
        <Button type="submit" className="self-start" disabled={pending}>
          {pending ? <Spinner /> : null}
          Save profile
        </Button>
      </FieldGroup>
    </form>
  );
}
