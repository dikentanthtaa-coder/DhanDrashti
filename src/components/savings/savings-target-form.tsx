"use client";

import * as React from "react";
import { toast } from "sonner";
import type { SavingsTargetType } from "@/lib/types/database";
import { updateSavingsTargetAction } from "@/lib/actions/savings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";

export function SavingsTargetForm({ type, value }: { type: SavingsTargetType | null; value: number | null }) {
  const [pending, startTransition] = React.useTransition();
  const [kind, setKind] = React.useState<"none" | "fixed" | "percent">(type ?? "none");
  const [amount, setAmount] = React.useState(value !== null ? String(value) : "");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updateSavingsTargetAction({ type: kind, value: kind === "none" ? "" : amount });
      if (r.ok) toast.success(r.message ?? "Saved");
      else {
        setError(r.fieldErrors?.value?.[0] ?? r.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-busy={pending}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="target-kind">Monthly savings target</FieldLabel>
          <NativeSelect id="target-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <NativeSelectOption value="none">No target</NativeSelectOption>
            <NativeSelectOption value="fixed">Fixed amount (₹ per month)</NativeSelectOption>
            <NativeSelectOption value="percent">Percentage of monthly income</NativeSelectOption>
          </NativeSelect>
        </Field>
        {kind !== "none" ? (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="target-value">{kind === "fixed" ? "Amount per month" : "Percent of income"}</FieldLabel>
            <div className="relative">
              {kind === "fixed" ? <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span> : null}
              <Input
                id="target-value"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={kind === "fixed" ? "pl-7 tabular" : "pr-8 tabular"}
                aria-invalid={!!error}
                placeholder={kind === "fixed" ? "10000" : "20"}
              />
              {kind === "percent" ? <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span> : null}
            </div>
            <FieldError>{error}</FieldError>
          </Field>
        ) : null}
      </FieldGroup>
      <Button type="submit" size="sm" className="self-start" disabled={pending}>
        {pending ? <Spinner /> : null}
        Save target
      </Button>
    </form>
  );
}
