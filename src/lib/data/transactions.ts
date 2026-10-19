import "server-only";

import { createClient } from "@/lib/supabase/server";
import { TRANSACTIONS_PAGE_SIZE } from "@/lib/constants";
import type { TransactionRow } from "@/lib/types/database";
import type { TransactionFilters } from "@/lib/validation/transactions";

export interface TransactionPage {
  rows: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, (m) => `\\${m}`).replace(/[(),]/g, " ");
}

export async function listTransactions(filters: TransactionFilters, pageSize = TRANSACTIONS_PAGE_SIZE): Promise<TransactionPage> {
  const supabase = await createClient();
  let query = supabase.from("transactions").select("*", { count: "exact" });

  if (filters.type === "refund") query = query.eq("transaction_type", "expense").eq("is_refund", true);
  else if (filters.type) query = query.eq("transaction_type", filters.type);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.accountId) query = query.or(`account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`);
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);
  if (filters.merchant) query = query.ilike("merchant", `%${escapeLike(filters.merchant)}%`);
  if (filters.start) query = query.gte("transaction_date", filters.start);
  if (filters.end) query = query.lte("transaction_date", filters.end);
  if (filters.q) {
    const term = `%${escapeLike(filters.q)}%`;
    query = query.or(`merchant.ilike.${term},note.ilike.${term}`);
  }

  switch (filters.sort) {
    case "date_asc":
      query = query.order("transaction_date", { ascending: true }).order("created_at", { ascending: true });
      break;
    case "amount_desc":
      query = query.order("amount", { ascending: false }).order("transaction_date", { ascending: false });
      break;
    case "amount_asc":
      query = query.order("amount", { ascending: true }).order("transaction_date", { ascending: false });
      break;
    default:
      query = query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  }

  const from = (filters.page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error("Could not load transactions");
  const total = count ?? 0;
  return {
    rows: data ?? [],
    total,
    page: filters.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTransaction(id: string): Promise<TransactionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function listRecentTransactions(limit = 8): Promise<TransactionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Distinct merchants for autocomplete (recent first). */
export async function listMerchants(limit = 50): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("merchant")
    .not("merchant", "is", null)
    .order("created_at", { ascending: false })
    .limit(300);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (row.merchant) seen.add(row.merchant);
    if (seen.size >= limit) break;
  }
  return [...seen];
}
