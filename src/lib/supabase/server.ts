import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/env";

/**
 * Server Supabase client bound to the request's auth cookies.
 * Create a new client per request; never share across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              httpOnly: options.httpOnly ?? true,
              sameSite: options.sameSite ?? "lax",
              secure: options.secure ?? process.env.NODE_ENV === "production",
            })
          );
        } catch {
          // Called from a Server Component: cookies cannot be written here.
          // The proxy (src/proxy.ts) refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
