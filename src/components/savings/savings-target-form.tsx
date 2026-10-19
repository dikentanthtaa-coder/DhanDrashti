"use client";

import { numericKeyGuard } from "@/components/common/amount-input";

import * as React from "react";
import { toast } from "sonner";
import type { SavingsTargetType } from "@/lib/types/database";
import { updateSavingsTargetAction } from "@/lib/actions/savings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { SegmentedChoice } from "@/components/settings/form-helpers";
import { Ban, IndianRupee, Percent } from "lucide-react";
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
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel id="target-kind-label">Monthly savings target</FieldLabel>
          <SegmentedChoice
            idPrefix="target-kind"
            aria-label="Monthly savings target type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "none", label: "No target", icon: <Ban /> },
              { value: "fixed", label: "Fixed amount", description: "₹ per month", icon: <IndianRupee /> },
              { value: "percent", label: "Percent of income", description: "of monthly income", icon: <Percent /> },
            ]}
          />
        </Field>
        {kind !== "none" ? (
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="target-value">{kind === "fixed" ? "Amount per month" : "Percent of income"}</FieldLabel>
            <div className="relative">
              {kind === "fixed" ? <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span> : null}
              <Input
                id="target-value"
                inputMode="decimal"
                onKeyDown={(e) => numericKeyGuard(e, { decimal: true })}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={kind === "fixed" ? "h-12 pl-7 text-xl font-semibold tabular" : "h-12 pr-8 text-xl font-semibold tabular"}
                aria-invalid={!!error}
                placeholder={kind === "fixed" ? "10000" : "20"}
              />
              {kind === "percent" ? <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span> : null}
            </div>
            <FieldError>{error}</FieldError>
          </Field>
        ) : null}
      </FieldGroup>
      <Button type="submit" className="self-end" disabled={pending}>
        {pending ? <Spinner /> : null}
        Save target
      </Button>
    </form>
  );
}
