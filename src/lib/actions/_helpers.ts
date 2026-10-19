import "server-only";

import { GENERIC_ERROR } from "@/lib/actions/result";

/** Flatten zod issues into { field: [messages] }. */
export function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Alias kept for callers that use the longer name. */
export const fieldErrorsFromZod = fieldErrorsFrom;

/** Map Postgres / PostgREST error codes to friendly, non-leaking messages. */
export function friendlyDbError(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string = GENERIC_ERROR
): string {
  if (!error) return fallback;
  switch (error.code) {
    case "42501":
      return "You can only use your own accounts, categories and goals.";
    case "23P01":
      return "A budget for this category already covers that period.";
    case "23505":
      return "A record with the same name already exists.";
    case "23503":
      return "This record is still referenced by other data.";
    case "23514":
      return "Some values are not allowed. Check the form and try again.";
    case "P0001":
    case "P0002":
      return error.message ?? fallback;
    default:
      return fallback;
  }
}
