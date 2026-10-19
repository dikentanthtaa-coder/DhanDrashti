"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { fieldErrorsFromZod, friendlyDbError } from "@/lib/actions/_helpers";
import { accountSchema } from "@/lib/validation/accounts";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const PATHS = ["/accounts", "/transactions", "/transactions/new", "/dashboard", "/savings", "/recurring"];

function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export async function createAccountAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      account_type: parsed.data.accountType,
      opening_balance: Number(parsed.data.openingBalance),
      is_active: parsed.data.isActive,
      currency: "INR",
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return fail("You already have an account with that name.", { name: ["Choose a different name"] });
    return fail(friendlyDbError(error));
  }
  revalidateAll();
  return ok({ id: data.id }, "Account created.");
}

export async function updateAccountAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!UUID_RE.test(id)) return fail("Invalid account.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      name: parsed.data.name,
      account_type: parsed.data.accountType,
      opening_balance: Number(parsed.data.openingBalance),
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    if (error.code === "23505") return fail("You already have an account with that name.", { name: ["Choose a different name"] });
    return fail(friendlyDbError(error));
  }
  revalidateAll();
  return ok(undefined, "Account updated.");
}

export async function setAccountActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!UUID_RE.test(id)) return fail("Invalid account.");
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_active: active }).eq("id", id).eq("user_id", user.id);
  if (error) return fail(friendlyDbError(error));
  revalidateAll();
  return ok(undefined, active ? "Account reactivated." : "Account deactivated.");
}

export async function deleteAccountRecordAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!UUID_RE.test(id)) return fail("Invalid account.");
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    if (error.code === "23503") return fail("This account has transactions. Deactivate it instead of deleting it.");
    return fail(friendlyDbError(error));
  }
  revalidateAll();
  return ok(undefined, "Account deleted.");
}
