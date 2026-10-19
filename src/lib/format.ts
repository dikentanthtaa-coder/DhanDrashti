import { formatINR } from "@/lib/finance/money";
import { formatDisplayDate } from "@/lib/finance/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { TransactionType } from "@/lib/types/database";

export { formatINR, formatDisplayDate };

export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function transactionTypeLabel(type: TransactionType, isRefund = false): string {
  if (type === "expense" && isRefund) return "Refund";
  return type === "income" ? "Income" : type === "expense" ? "Expense" : "Transfer";
}

/** Signed display for list rows: income +, expense -, refund +, transfer neutral. */
export function signedAmount(type: TransactionType, amount: number, isRefund = false): string {
  if (type === "income" || (type === "expense" && isRefund)) return formatINR(amount, { signed: true });
  if (type === "expense") return `-${formatINR(amount)}`;
  return formatINR(amount);
}

export function amountColorClass(type: TransactionType, isRefund = false): string {
  if (type === "income" || (type === "expense" && isRefund)) return "text-income";
  if (type === "expense") return "text-expense";
  return "text-transfer";
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
