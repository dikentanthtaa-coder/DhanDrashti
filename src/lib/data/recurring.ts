import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OccurrenceRow, RecurringTransactionRow } from "@/lib/types/database";

export async function listRecurring(): Promise<RecurringTransactionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_transactions")
    .select("*")
    .order("status", { ascending: true })
    .order("next_due_date", { ascending: true });
  return data ?? [];
}

export async function getRecurring(id: string): Promise<RecurringTransactionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("recurring_transactions").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/** Active schedules due within the next `days` days (for the dashboard widget). */
export async function listUpcomingRecurring(fromDate: string, days = 30, limit = 6): Promise<RecurringTransactionRow[]> {
  const supabase = await createClient();
  const end = new Date(fromDate);
  end.setDate(end.getDate() + days);
  const endStr = end.toISOString().slice(0, 10);
  const { data } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("status", "active")
    .lte("next_due_date", endStr)
    .order("next_due_date", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function listOccurrences(recurringId?: string, limit = 50): Promise<OccurrenceRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("recurring_transaction_occurrences")
    .select("*")
    .order("scheduled_date", { ascending: false })
    .limit(limit);
  if (recurringId) query = query.eq("recurring_transaction_id", recurringId);
  const { data } = await query;
  return data ?? [];
}

export async function listPendingOccurrences(): Promise<OccurrenceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_transaction_occurrences")
    .select("*")
    .eq("status", "pending")
    .order("scheduled_date", { ascending: true })
    .limit(100);
  return data ?? [];
}
