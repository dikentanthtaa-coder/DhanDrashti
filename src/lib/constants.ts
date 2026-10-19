import type { AccountType, Frequency, PaymentMethod, TransactionType } from "@/lib/types/database";

export const APP_NAME = "DhanDrashti";
export const APP_DESCRIPTION = "Track expenses, budgets and savings in ₹ — private, fast and installable.";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "debit_card", label: "Debit Card" },
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

export const ACCOUNT_TYPES: { value: AccountType; label: string; description: string }[] = [
  { value: "cash", label: "Cash", description: "Physical cash in hand" },
  { value: "bank", label: "Bank", description: "Current or salary account" },
  { value: "savings", label: "Savings", description: "Counts toward your tracked savings balance" },
  { value: "credit_card", label: "Credit Card", description: "Balance shows the amount owed" },
  { value: "other", label: "Other", description: "Loans, wallets, investments, etc." },
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  savings: "Savings",
  credit_card: "Credit Card",
  other: "Other",
};

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export const DEFAULT_ALERT_THRESHOLDS = [80, 100];

export const TRANSACTIONS_PAGE_SIZE = 25;
export const MAX_EXPORT_ROWS = 100_000;

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const RECEIPT_BUCKET = "receipts";
export const RECEIPT_SIGNED_URL_SECONDS = 120;

export const ROUTES = {
  dashboard: "/dashboard",
  transactions: "/transactions",
  newTransaction: "/transactions/new",
  reports: "/reports",
  budgets: "/budgets",
  savings: "/savings",
  recurring: "/recurring",
  categories: "/categories",
  accounts: "/accounts",
  notifications: "/notifications",
  settings: "/settings",
  profile: "/settings/profile",
  security: "/settings/security",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;
