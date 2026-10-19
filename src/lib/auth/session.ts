import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types/database";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

/**
 * Server-verified identity. Cached per request so layouts, pages and actions
 * share one auth round-trip. Never trust a user id sent by the browser.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  // Profile should exist via trigger; create defensively (RLS allows own insert).
  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: user.email?.split("@")[0] ?? "" })
    .select("*")
    .maybeSingle();
  return created ?? null;
});

/** Use in Server Components / Actions that require a signed-in user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserWithProfile(): Promise<{ user: User; profile: ProfileRow; timezone: string }> {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  return {
    user,
    profile: profile ?? fallbackProfile(user),
    timezone: profile?.timezone ?? DEFAULT_TIMEZONE,
  };
}

function fallbackProfile(user: User): ProfileRow {
  const now = new Date().toISOString();
  return {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "",
    preferred_currency: "INR",
    timezone: DEFAULT_TIMEZONE,
    savings_target_type: null,
    savings_target_value: null,
    email_alerts_enabled: false,
    avatar_path: null,
    created_at: now,
    updated_at: now,
  };
}
