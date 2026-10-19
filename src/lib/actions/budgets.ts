"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, ok, GENERIC_ERROR, type ActionResult } from "@/lib/actions/result";
import { budgetSchema } from "@/lib/validation/budgets";
import { uuidSchema } from "@/lib/validation/common";
import { runBudgetAlerts } from "@/lib/budget-alerts";
import { fieldErrorsFrom, friendlyDbError } from "@/lib/actions/_helpers";

const PATHS = ["/budgets", "/dashboard", "/savings", "/notifications"];
function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export async function createBudgetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      category_id: parsed.data.categoryId,
      amount_limit: Number(parsed.data.amountLimit),
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      alert_thresholds: parsed.data.alertThresholds,
    })
    .select("id")
    .single();
  if (error || !data) return fail(friendlyDbError(error, GENERIC_ERROR));
  await runBudgetAlerts();
  revalidate();
  return ok({ id: data.id }, "Budget created.");
}

export async function updateBudgetAction(id: unknown, input: unknown): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return fail("Invalid budget.");
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .update({
      category_id: parsed.data.categoryId,
      amount_limit: Number(parsed.data.amountLimit),
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      alert_thresholds: parsed.data.alertThresholds,
    })
    .eq("id", idParsed.data)
    .select("id");
  if (error) return fail(friendlyDbError(error, GENERIC_ERROR));
  if (!data || data.length === 0) return fail("Budget not found.");
  await runBudgetAlerts();
  revalidate();
  return ok(undefined, "Budget updated.");
}

export async function deleteBudgetAction(id: unknown): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return fail("Invalid budget.");
  await requireUser();
  const supabase = await createClient();
  const { error, data } = await supabase.from("budgets").delete().eq("id", idParsed.data).select("id");
  if (error) return fail(friendlyDbError(error, GENERIC_ERROR));
  if (!data || data.length === 0) return fail("Budget not found.");
  revalidate();
  return ok(undefined, "Budget deleted.");
}
