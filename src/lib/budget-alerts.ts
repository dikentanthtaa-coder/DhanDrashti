import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { isEmailConfigured, sendEmail, escapeHtml } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import type { NotificationRow } from "@/lib/types/database";

/**
 * Run after any expense mutation. Inserts in-app budget alerts for newly crossed
 * thresholds (deduplicated in SQL) and optionally emails them. Safe to call
 * repeatedly; returns the notifications created by THIS call only.
 */
export async function runBudgetAlerts(forDate?: string): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_budget_alerts", forDate ? { p_date: forDate } : {});
  const created = data ?? [];
  if (created.length === 0) return created;

  if (isEmailConfigured()) {
    const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
    if (user?.email && profile?.email_alerts_enabled) {
      for (const n of created) {
        await sendEmail({
          to: user.email,
          subject: `DhanDrashti: ${n.title}`,
          text: `${n.message}\n\nOpen your budgets: ${publicEnv.siteUrl}/budgets`,
          html: `<p>${escapeHtml(n.message)}</p><p><a href="${publicEnv.siteUrl}/budgets">Open your budgets</a></p>`,
        });
      }
    }
  }
  return created;
}
