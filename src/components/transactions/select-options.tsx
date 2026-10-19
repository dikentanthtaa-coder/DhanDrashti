"use client";

import { Banknote, CircleDollarSign, CircleEllipsis, CreditCard, Landmark, PiggyBank, Smartphone, Wallet } from "lucide-react";
import type { AccountRow, AccountType, PaymentMethod } from "@/lib/types/database";
import { ACCOUNT_TYPE_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import type { FormSelectOption } from "@/components/common/form-select";

/** Icon per account type, shared by selects and lists. */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  cash: Wallet,
  bank: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  other: CircleDollarSign,
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  upi: Smartphone,
  debit_card: CreditCard,
  credit_card: CreditCard,
  bank_transfer: Landmark,
  wallet: Wallet,
  other: CircleEllipsis,
};

/** Options for an account dropdown: name + type, with an icon. */
export function accountOptions(accounts: AccountRow[], options?: { withType?: boolean }): FormSelectOption[] {
  return accounts.map((a) => {
    const Icon = ACCOUNT_TYPE_ICONS[a.account_type];
    return {
      value: a.id,
      label: a.name,
      text: a.name,
      description:
        options?.withType === false || a.name.trim().toLowerCase() === ACCOUNT_TYPE_LABELS[a.account_type].toLowerCase()
          ? undefined
          : ACCOUNT_TYPE_LABELS[a.account_type],
      icon: <Icon className="text-muted-foreground" />,
    };
  });
}

/** Options for a payment-method dropdown with icons. */
export function paymentMethodOptions(): FormSelectOption[] {
  return PAYMENT_METHODS.map((m) => {
    const Icon = PAYMENT_METHOD_ICONS[m.value];
    return { value: m.value, label: m.label, text: m.label, icon: <Icon className="text-muted-foreground" /> };
  });
}

/** Account-type options (for the account form). */
export function accountTypeOptions(types: { value: AccountType; label: string; description: string }[]): FormSelectOption[] {
  return types.map((t) => {
    const Icon = ACCOUNT_TYPE_ICONS[t.value];
    return { value: t.value, label: t.label, text: t.label, description: t.description, icon: <Icon className="text-muted-foreground" /> };
  });
}
