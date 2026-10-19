"use client";

/**
 * Small reusable form building blocks shared by the budgets, savings, recurring
 * and settings forms: option builders for FormSelect, a segmented choice control
 * and a toggle pill.
 */
import * as React from "react";
import { Banknote, CircleEllipsis, CreditCard, Landmark, PiggyBank, Smartphone, Wallet, Check } from "lucide-react";
import type { AccountRow, Frequency, PaymentMethod } from "@/lib/types/database";
import { ACCOUNT_TYPE_LABELS, FREQUENCIES, PAYMENT_METHODS } from "@/lib/constants";
import type { FormSelectOption } from "@/components/common/form-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const ACCOUNT_ICONS: Record<AccountRow["account_type"], React.ReactNode> = {
  cash: <Wallet />,
  bank: <Landmark />,
  savings: <PiggyBank />,
  credit_card: <CreditCard />,
  other: <CircleEllipsis />,
};

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote />,
  upi: <Smartphone />,
  debit_card: <CreditCard />,
  credit_card: <CreditCard />,
  bank_transfer: <Landmark />,
  wallet: <Wallet />,
  other: <CircleEllipsis />,
};

const FREQUENCY_HINTS: Record<Frequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Same day each month (31st → month end)",
  yearly: "Same date each year",
};

export function accountOptions(accounts: AccountRow[]): FormSelectOption[] {
  return accounts.map((a) => ({
    value: a.id,
    label: a.name,
    text: a.name,
    description: ACCOUNT_TYPE_LABELS[a.account_type],
    icon: ACCOUNT_ICONS[a.account_type],
  }));
}

export function paymentMethodOptions(): FormSelectOption[] {
  return PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label, text: m.label, icon: PAYMENT_ICONS[m.value] }));
}

export function frequencyOptions(): FormSelectOption[] {
  return FREQUENCIES.map((f) => ({ value: f.value, label: f.label, text: f.label, description: FREQUENCY_HINTS[f.value] }));
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Tailwind classes applied when selected (e.g. tint by transaction type) */
  activeClassName?: string;
}

/** Radio group rendered as selectable cards (keyboard + screen-reader friendly). */
export function SegmentedChoice<T extends string>({
  value,
  onChange,
  options,
  idPrefix,
  columns,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  idPrefix: string;
  columns?: 1 | 2 | 3;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const cols = columns ?? (options.length >= 3 ? 3 : options.length === 2 ? 2 : 1);
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as T)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("grid gap-2", cols === 1 ? "grid-cols-1" : "grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]")}
    >
      {options.map((o) => {
        const id = `${idPrefix}-${o.value}`;
        const active = value === o.value;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              "flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-sm transition-colors hover:border-ring/60 has-focus-visible:ring-3 has-focus-visible:ring-primary/25",
              active ? (o.activeClassName ?? "border-primary bg-primary/10") : "border-input",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <RadioGroupItem id={id} value={o.value} className="sr-only" />
            {o.icon ? (
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                {o.icon}
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium">{o.label}</span>
              {o.description ? <span className="truncate text-xs text-muted-foreground">{o.description}</span> : null}
            </span>
            {active ? <Check className="ml-auto size-4 shrink-0 self-center" aria-hidden="true" /> : null}
          </label>
        );
      })}
    </RadioGroup>
  );
}

/** Toggleable pill, used for alert thresholds. */
export function PillToggle({ pressed, onPressedChange, children, ariaLabel }: { pressed: boolean; onPressedChange: (v: boolean) => void; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={ariaLabel}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/25",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground hover:border-ring/60 hover:text-foreground"
      )}
    >
      {pressed ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Inline error banner used at the top of forms. */
export function FormErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
