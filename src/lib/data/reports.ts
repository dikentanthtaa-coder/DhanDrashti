import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CategoryTotal,
  CategoryType,
  DailyTotal,
  MerchantTotal,
  MonthlyTotal,
  PaymentMethodTotal,
  PeriodSummary,
} from "@/lib/types/database";
import type { DateRange } from "@/lib/finance/dates";

const EMPTY_SUMMARY: PeriodSummary = {
  total_income: 0,
  gross_expense: 0,
  total_refund: 0,
  net_expense: 0,
  total_transfers: 0,
  transaction_count: 0,
};

export async function getPeriodSummary(range: DateRange): Promise<PeriodSummary> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("period_summary", { p_start: range.start, p_end: range.end });
  return data?.[0] ?? EMPTY_SUMMARY;
}

export async function getCategoryTotals(range: DateRange, type: CategoryType = "expense"): Promise<CategoryTotal[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("category_totals", { p_start: range.start, p_end: range.end, p_type: type });
  return data ?? [];
}

export async function getDailyTotals(range: DateRange): Promise<DailyTotal[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("daily_totals", { p_start: range.start, p_end: range.end });
  return data ?? [];
}

export async function getMonthlyTotals(range: DateRange): Promise<MonthlyTotal[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("monthly_totals", { p_start: range.start, p_end: range.end });
  return data ?? [];
}

export async function getPaymentMethodTotals(range: DateRange): Promise<PaymentMethodTotal[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("payment_method_totals", { p_start: range.start, p_end: range.end });
  return data ?? [];
}

export async function getMerchantTotals(range: DateRange, limit = 10): Promise<MerchantTotal[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("merchant_totals", { p_start: range.start, p_end: range.end, p_limit: limit });
  return data ?? [];
}

/** Roll subcategory totals up into their parent category. */
export function rollupToParents(totals: CategoryTotal[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const t of totals) {
    const key = t.parent_id ?? t.category_id;
    const existing = map.get(key);
    if (existing) {
      existing.total = Number(existing.total) + Number(t.total);
      existing.tx_count = Number(existing.tx_count) + Number(t.tx_count);
    } else {
      map.set(key, {
        category_id: key,
        category_name: t.parent_name ?? t.category_name,
        parent_id: null,
        parent_name: null,
        icon: t.icon,
        color: t.color,
        total: Number(t.total),
        tx_count: Number(t.tx_count),
      });
    }
  }
  return [...map.values()].sort((a, b) => Number(b.total) - Number(a.total));
}
