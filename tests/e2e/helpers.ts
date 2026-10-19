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

// Hosted Supabase rejects reserved domains such as example.com; use a real-looking
// domain with no mailbox so verification emails simply bounce.
export function testCredentials(label: string): { email: string; password: string } {
  return { email: `e2e-${label}-${randomUUID().slice(0, 8)}@dhandrashti.vercel.app`, password: `E2e-pass-${randomUUID().slice(0, 10)}1` };
}

/** Creates an already-verified user (simulates completed email verification). */
export async function createVerifiedUser(label: string, credentials?: { email: string; password: string }): Promise<E2EUser> {
  const admin = adminClient();
  const creds = credentials ?? testCredentials(label);
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

/** Removes the user's receipt files (storage does not cascade) and then the auth user. */
export async function deleteUser(id: string) {
  const admin = adminClient();
  try {
    const { data: folders } = await admin.storage.from("receipts").list(id, { limit: 1000 });
    const paths: string[] = [];
    for (const folder of folders ?? []) {
      const { data: files } = await admin.storage.from("receipts").list(`${id}/${folder.name}`, { limit: 1000 });
      for (const f of files ?? []) paths.push(`${id}/${folder.name}/${f.name}`);
    }
    if (paths.length) await admin.storage.from("receipts").remove(paths);
  } catch {
    /* best effort */
  }
  await admin.auth.admin.deleteUser(id).catch(() => {});
}
