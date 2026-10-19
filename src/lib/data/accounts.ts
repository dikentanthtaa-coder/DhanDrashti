import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AccountBalance, AccountRow } from "@/lib/types/database";

export const listAccounts = cache(async (options?: { activeOnly?: boolean }): Promise<AccountRow[]> => {
  const supabase = await createClient();
  let query = supabase.from("accounts").select("*").order("created_at", { ascending: true });
  if (options?.activeOnly) query = query.eq("is_active", true);
  const { data } = await query;
  return data ?? [];
});

export const getAccountBalances = cache(async (): Promise<AccountBalance[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("account_balances");
  return data ?? [];
});

export async function getAccount(id: string): Promise<AccountRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
