import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/dashboard", "/reset-password", "/settings/security", "/settings/profile"]);

/**
 * Handles email verification and password-reset links (token_hash flow) as well
 * as PKCE `code` exchanges. On success the session cookie is set and the user is
 * redirected to a whitelisted in-app path.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = ALLOWED_NEXT.has(nextParam) ? nextParam : "/dashboard";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const target = type === "recovery" ? "/reset-password" : next;
      return NextResponse.redirect(new URL(`${target}${type === "signup" || type === "email" ? "?verified=1" : ""}`, origin));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/auth/error", origin));
}
