import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types/database";

export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
});

export async function listNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listUnreadNotifications(limit = 5): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
