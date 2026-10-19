import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * E2E helpers. The suite needs a real Supabase project:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
 * The secret key is used only to create/confirm/delete throwaway test users
 * (simulating email verification) — never to read application data.
 */
export function e2eConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface E2EUser {
  id: string;
  email: string;
  password: string;
}

export function testCredentials(label: string): { email: string; password: string } {
  return { email: `e2e-${label}-${randomUUID().slice(0, 8)}@example.com`, password: `E2e-pass-${randomUUID().slice(0, 10)}1` };
}

/** Creates an already-verified user (simulates completed email verification). */
export async function createVerifiedUser(label: string): Promise<E2EUser> {
  const admin = adminClient();
  const creds = testCredentials(label);
  const { data, error } = await admin.auth.admin.createUser({
    email: creds.email,
    password: creds.password,
    email_confirm: true,
    user_metadata: { display_name: `E2E ${label}` },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return { id: data.user.id, ...creds };
}

/** Marks a UI-registered user as verified (simulates clicking the email link). */
export async function confirmUserByEmail(email: string): Promise<string> {
  const admin = adminClient();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      await admin.auth.admin.updateUserById(found.id, { email_confirm: true });
      return found.id;
    }
    if (data.users.length < 200) throw new Error(`user ${email} not found`);
    page += 1;
  }
}

export async function deleteUser(id: string) {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(id).catch(() => {});
}
