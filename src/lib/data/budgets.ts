import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BudgetHistoryRow, BudgetRow, BudgetUsage } from "@/lib/types/database";

export async function listBudgets(): Promise<BudgetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("budgets").select("*").order("period_start", { ascending: false });
  return data ?? [];
}

export async function getBudget(id: string): Promise<BudgetRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("budgets").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/** Usage for every budget active in the month containing `date` (yyyy-MM-dd). */
export async function getBudgetUsage(date: string): Promise<BudgetUsage[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("budget_usage", { p_month: date });
  return data ?? [];
}

export async function getBudgetHistory(budgetId: string, months = 6): Promise<BudgetHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("budget_history", { p_budget_id: budgetId, p_months: months });
  return data ?? [];
}
