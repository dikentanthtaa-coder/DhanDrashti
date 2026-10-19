/** Shared shape for server action results (serialisable, no thrown errors across the wire). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail<T = undefined>(error: string, fieldErrors?: Record<string, string[]>): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

/** Rate-limited failure: the UI shows a countdown and re-enables the form afterwards. */
export function rateLimited<T = undefined>(error: string, retryAfterSeconds: number): ActionResult<T> {
  return { ok: false, error, retryAfterSeconds };
}

/** Supabase's default email sender allows only a few emails per hour (rolling window). */
export const EMAIL_LIMIT_SECONDS = 60 * 60;
/** Generic auth attempt throttling resets within a minute. */
export const ATTEMPT_LIMIT_SECONDS = 60;

/** Generic, non-enumerating error text for unexpected failures. */
export const GENERIC_ERROR = "Something went wrong. Please try again.";
