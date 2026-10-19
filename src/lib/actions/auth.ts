"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok, GENERIC_ERROR, type ActionResult } from "@/lib/actions/result";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";
import { RECEIPT_BUCKET } from "@/lib/constants";

async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return publicEnv.siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : publicEnv.siteUrl;
}

/** Only allow same-site relative redirects (no open redirects). */
function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/dashboard";
  if (next.startsWith("/auth/") || next === "/login" || next === "/signup") return "/dashboard";
  return next;
}

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ needsVerification: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const { email, password, displayName } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    // Errors that do not reveal whether an account exists are shown to the user;
    // anything else stays generic so that account existence is not revealed.
    if (error.code === "weak_password") return fail(error.message, { password: [error.message] });
    if (error.code === "email_address_invalid" || error.code === "validation_failed") {
      return fail("Enter a valid, deliverable email address.", { email: ["Enter a valid, deliverable email address."] });
    }
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return fail("Too many attempts. Please wait a minute and try again.");
    }
    if (error.code === "signup_disabled") return fail("Sign-ups are currently disabled.");
    if (error.message?.toLowerCase().includes("error sending") || error.code === "unexpected_failure") {
      console.error("signUp: email delivery failed", error.code ?? error.status);
      return fail("We couldn't send the verification email right now. Please try again in a few minutes.");
    }
    return ok({ needsVerification: true });
  }

  // If confirmations are disabled, a session exists already.
  if (data.session) redirect("/dashboard");
  return ok({ needsVerification: true });
}

export async function signInAction(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Please verify your email address first. Check your inbox for the confirmation link.");
    }
    if (error.status === 429) return fail("Too many attempts. Please wait a minute and try again.");
    return fail("Invalid email or password.");
  }
  redirect(safeNext(next));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function resendVerificationAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a valid email address.", fieldErrors(parsed.error));
  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/dashboard` },
  });
  return ok(undefined, "If that address needs verification, a new link has been sent.");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a valid email address.", fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error && error.status === 429) return fail("Too many attempts. Please wait a minute and try again.");
  // Always generic to avoid account enumeration.
  return ok(undefined, "If an account exists for that email, a reset link is on its way.");
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Choose a password you have not used before.");
    return fail(error.message || GENERIC_ERROR);
  }
  // Invalidate other sessions after a password reset.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/dashboard?password=updated");
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const user = await getCurrentUser();
  if (!user?.email) return fail("You need to be signed in.");

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_limit_hit", { p_key: "change-password", p_limit: 5, p_window_seconds: 900 });
  if (allowed === false) return fail("Too many attempts. Please try again in 15 minutes.");

  // Re-authenticate with the current password before changing it.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) return fail("Current password is incorrect.", { currentPassword: ["Current password is incorrect."] });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Choose a different password from your current one.");
    return fail(error.message || GENERIC_ERROR);
  }
  await supabase.auth.signOut({ scope: "others" });
  return ok(undefined, "Password updated. Other devices have been signed out.");
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");

  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return fail("Unknown timezone.", { timezone: ["Choose a valid timezone"] });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      email_alerts_enabled: parsed.data.emailAlertsEnabled,
    })
    .eq("id", user.id);
  if (error) return fail(GENERIC_ERROR);
  await supabase.auth.updateUser({ data: { display_name: parsed.data.displayName } });
  return ok(undefined, "Profile saved.");
}

/**
 * Permanently deletes the account: receipts in storage, then the auth user
 * (all tables cascade from auth.users). Requires the server-only secret key.
 */
export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const user = await getCurrentUser();
  if (!user?.email) return fail("You need to be signed in.");
  if (!isAdminConfigured()) {
    return fail("Account deletion is not enabled on this deployment. Contact support to delete your account.");
  }

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_limit_hit", { p_key: "delete-account", p_limit: 3, p_window_seconds: 3600 });
  if (allowed === false) return fail("Too many attempts. Please try again later.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.password });
  if (verifyError) return fail("Password is incorrect.", { password: ["Password is incorrect."] });

  // Remove receipt files using the user's own (RLS-scoped) session.
  try {
    const paths: string[] = [];
    const { data: folders } = await supabase.storage.from(RECEIPT_BUCKET).list(user.id, { limit: 1000 });
    for (const folder of folders ?? []) {
      const { data: files } = await supabase.storage.from(RECEIPT_BUCKET).list(`${user.id}/${folder.name}`, { limit: 1000 });
      for (const f of files ?? []) paths.push(`${user.id}/${folder.name}/${f.name}`);
    }
    if (paths.length) await supabase.storage.from(RECEIPT_BUCKET).remove(paths);
  } catch {
    // Best effort; the auth user deletion below is the authoritative step.
  }

  const admin = createAdminClient();
  if (!admin) return fail("Account deletion is not enabled on this deployment.");
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return fail("Could not delete the account right now. Please try again.");

  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?deleted=1");
}
