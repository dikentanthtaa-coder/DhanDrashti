/** Route → header title/description. Used by the top bar on every module. */
export interface PageTitle {
  title: string;
  description?: string;
}

const EXACT: Record<string, PageTitle> = {
  "/dashboard": { title: "Dashboard", description: "Your money at a glance" },
  "/transactions": { title: "Transactions", description: "Every expense, income and transfer" },
  "/transactions/new": { title: "Add transaction", description: "Record an expense, income or a transfer between your accounts" },
  "/reports": { title: "Reports", description: "Analyse spending and income for any period" },
  "/reports/print": { title: "Print report" },
  "/budgets": { title: "Budgets", description: "Monthly limits with alerts" },
  "/savings": { title: "Savings planner", description: "Targets, goals and recommendations" },
  "/recurring": { title: "Recurring", description: "Bills, EMIs, subscriptions and salary on schedule" },
  "/categories": { title: "Categories", description: "Default and custom categories" },
  "/accounts": { title: "Accounts", description: "Cash, bank, savings and cards" },
  "/notifications": { title: "Notifications", description: "Budget alerts and reminders" },
  "/settings": { title: "Settings", description: "Profile, security and app options" },
  "/settings/profile": { title: "Profile", description: "Name, timezone and alerts" },
  "/settings/security": { title: "Security", description: "Password and account" },
};

const UUID = "[0-9a-f-]{36}";
const PATTERNS: [RegExp, PageTitle][] = [
  [new RegExp(`^/transactions/${UUID}/edit$`), { title: "Edit transaction", description: "Update the details of this transaction" }],
  [new RegExp(`^/transactions/${UUID}$`), { title: "Transaction", description: "Details and receipt" }],
];

export function pageTitleFor(pathname: string): PageTitle {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (EXACT[clean]) return EXACT[clean];
  for (const [re, t] of PATTERNS) if (re.test(clean)) return t;
  const seg = clean.split("/").filter(Boolean)[0];
  return { title: seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : "DhanDrashti" };
}
