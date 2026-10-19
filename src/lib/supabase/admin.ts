import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/env";

/**
 * Privileged client using the server-only secret key. It bypasses RLS, so it is
 * used ONLY for: account deletion (auth admin API), the scheduled recurring
 * processor, and sending alert emails. Returns null when not configured.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
}
