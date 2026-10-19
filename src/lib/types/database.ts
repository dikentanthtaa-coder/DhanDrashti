/**
 * Hand-maintained database types mirroring supabase/migrations.
 * Keep in sync when migrations change. NUMERIC columns arrive as JSON numbers;
 * authoritative arithmetic happens in SQL or via Decimal (src/lib/finance/money.ts).
 */

export type AccountType = "cash" | "bank" | "savings" | "credit_card" | "other";
export type CategoryType = "income" | "expense";
export type TransactionType = "income" | "expense" | "transfer";
export type PaymentMethod =
  | "cash"
  | "upi"
  | "debit_card"
  | "credit_card"
  | "bank_transfer"
  | "wallet"
  | "other";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type PostingMode = "auto_post" | "reminder";
export type RecurringStatus = "active" | "paused" | "cancelled" | "completed";
export type OccurrenceStatus = "posted" | "pending" | "skipped" | "failed";
export type GoalStatus = "active" | "completed" | "archived";
export type NotificationType = "budget_alert" | "recurring_reminder" | "recurring_posted" | "system";
export type SavingsTargetType = "fixed" | "percent";

export type ProfileRow = {
  id: string;
  display_name: string;
  preferred_currency: string;
  timezone: string;
  savings_target_type: SavingsTargetType | null;
  savings_target_value: number | null;
  email_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  opening_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryRow = {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  slug: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  transaction_type: TransactionType;
  is_refund: boolean;
  amount: number;
  currency: string;
  transaction_date: string;
  merchant: string | null;
  payment_method: PaymentMethod | null;
  note: string | null;
  receipt_path: string | null;
  recurring_transaction_id: string | null;
  savings_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  period_type: "monthly";
  period_start: string;
  period_end: string | null;
  amount_limit: number;
  currency: string;
  alert_thresholds: number[];
  created_at: string;
  updated_at: string;
}

export type SavingsGoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  description: string | null;
  status: GoalStatus;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringTransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  frequency: Frequency;
  start_date: string;
  next_due_date: string;
  end_date: string | null;
  anchor_day: number;
  merchant: string | null;
  note: string | null;
  payment_method: PaymentMethod | null;
  posting_mode: PostingMode;
  status: RecurringStatus;
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OccurrenceRow = {
  id: string;
  user_id: string;
  recurring_transaction_id: string;
  scheduled_date: string;
  transaction_id: string | null;
  status: OccurrenceStatus;
  created_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_budget_id: string | null;
  related_category_id: string | null;
  related_recurring_id: string | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
}

type Insertable<Row, Required extends keyof Row, Generated extends keyof Row = never> = Pick<
  Row,
  Required
> &
  Partial<Omit<Row, Required | Generated>>;

export type PeriodSummary = {
  total_income: number;
  gross_expense: number;
  total_refund: number;
  net_expense: number;
  total_transfers: number;
  transaction_count: number;
}

export type CategoryTotal = {
  category_id: string;
  category_name: string;
  parent_id: string | null;
  parent_name: string | null;
  icon: string | null;
  color: string | null;
  total: number;
  tx_count: number;
}

export type DailyTotal = {
  day: string;
  income: number;
  expense: number;
}

export type MonthlyTotal = {
  month: string;
  income: number;
  expense: number;
  refunds: number;
}

export type PaymentMethodTotal = {
  payment_method: string;
  total: number;
  tx_count: number;
}

export type MerchantTotal = {
  merchant: string;
  total: number;
  tx_count: number;
}

export type AccountBalance = {
  account_id: string;
  name: string;
  account_type: AccountType;
  is_active: boolean;
  balance: number;
}

export type BudgetUsage = {
  budget_id: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  amount_limit: number;
  spent: number;
  remaining: number;
  percent_used: number;
  alert_thresholds: number[];
  period_start: string;
  period_end: string | null;
}

export type BudgetHistoryRow = {
  month: string;
  amount_limit: number;
  spent: number;
}

export type SavingsGoalProgress = {
  goal_id: string;
  saved: number;
  contribution_count: number;
  last_contribution: string | null;
}

export type RecurringProcessResult = {
  posted: number;
  reminders: number;
  completed: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow, "id", "created_at" | "updated_at">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      accounts: {
        Row: AccountRow;
        Insert: Insertable<AccountRow, "user_id" | "name" | "account_type", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AccountRow, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Insertable<CategoryRow, "name" | "type", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CategoryRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: Insertable<
          TransactionRow,
          "user_id" | "account_id" | "transaction_type" | "amount" | "transaction_date",
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Omit<TransactionRow, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      budgets: {
        Row: BudgetRow;
        Insert: Insertable<BudgetRow, "user_id" | "period_start" | "amount_limit", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BudgetRow, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      savings_goals: {
        Row: SavingsGoalRow;
        Insert: Insertable<SavingsGoalRow, "user_id" | "name" | "target_amount", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SavingsGoalRow, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      recurring_transactions: {
        Row: RecurringTransactionRow;
        Insert: Insertable<
          RecurringTransactionRow,
          | "user_id"
          | "account_id"
          | "transaction_type"
          | "amount"
          | "frequency"
          | "start_date"
          | "next_due_date"
          | "anchor_day",
          "id" | "created_at" | "updated_at" | "is_active"
        >;
        Update: Partial<Omit<RecurringTransactionRow, "id" | "user_id" | "created_at" | "updated_at" | "is_active">>;
        Relationships: [];
      };
      recurring_transaction_occurrences: {
        Row: OccurrenceRow;
        Insert: Insertable<OccurrenceRow, "user_id" | "recurring_transaction_id" | "scheduled_date" | "status", "id" | "created_at">;
        Update: Partial<Omit<OccurrenceRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Insertable<NotificationRow, "user_id" | "type" | "title" | "message", "id" | "created_at">;
        Update: Partial<Omit<NotificationRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      period_summary: { Args: { p_start: string; p_end: string }; Returns: PeriodSummary[] };
      category_totals: { Args: { p_start: string; p_end: string; p_type?: CategoryType }; Returns: CategoryTotal[] };
      daily_totals: { Args: { p_start: string; p_end: string }; Returns: DailyTotal[] };
      monthly_totals: { Args: { p_start: string; p_end: string }; Returns: MonthlyTotal[] };
      payment_method_totals: { Args: { p_start: string; p_end: string }; Returns: PaymentMethodTotal[] };
      merchant_totals: { Args: { p_start: string; p_end: string; p_limit?: number }; Returns: MerchantTotal[] };
      account_balances: { Args: Record<string, never>; Returns: AccountBalance[] };
      budget_usage: { Args: { p_month: string }; Returns: BudgetUsage[] };
      budget_history: { Args: { p_budget_id: string; p_months?: number }; Returns: BudgetHistoryRow[] };
      savings_goal_progress: { Args: Record<string, never>; Returns: SavingsGoalProgress[] };
      check_budget_alerts: { Args: { p_date?: string }; Returns: NotificationRow[] };
      process_my_recurring_transactions: { Args: { p_as_of?: string }; Returns: RecurringProcessResult[] };
      process_all_recurring_transactions: {
        Args: Record<string, never>;
        Returns: Array<RecurringProcessResult & { user_id: string }>;
      };
      confirm_recurring_occurrence: { Args: { p_occurrence_id: string; p_transaction_date?: string }; Returns: string };
      rate_limit_hit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      recurring_next_date: { Args: { p_frequency: Frequency; p_from: string; p_anchor_day: number }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
