/** Shared shape for server action results (serialisable, no thrown errors across the wire). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail<T = undefined>(error: string, fieldErrors?: Record<string, string[]>): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

/** Generic, non-enumerating error text for unexpected failures. */
export const GENERIC_ERROR = "Something went wrong. Please try again.";
