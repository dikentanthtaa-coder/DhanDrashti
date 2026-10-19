import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/env";

export const PUBLIC_ROUTES = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/confirm",
  "/auth/callback",
  "/auth/error",
  "/~offline",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/og.png",
  "/privacy",
]);

/** Routes that only make sense when signed OUT. */
const AUTH_ONLY_ROUTES = new Set<string>(["/login", "/signup", "/forgot-password"]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return pathname.startsWith("/api/cron/") || pathname.startsWith("/icons/");
}

/**
 * Refreshes the Supabase session cookie and enforces optimistic route protection.
 * Server Components and Server Actions still verify the user themselves.
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: options.httpOnly ?? true,
            sameSite: options.sameSite ?? "lax",
            secure: options.secure ?? process.env.NODE_ENV === "production",
          })
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getClaims/getUser.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/" && !pathname.startsWith("/api/")) {
      url.searchParams.set("next", pathname + search);
    }
    if (pathname.startsWith("/api/")) {
      return withCookies(response, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return withCookies(response, NextResponse.redirect(url));
  }

  if (isAuthenticated && (AUTH_ONLY_ROUTES.has(pathname) || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withCookies(response, NextResponse.redirect(url));
  }

  return response;
}

function withCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
