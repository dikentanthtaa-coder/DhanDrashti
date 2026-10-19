"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, ok, GENERIC_ERROR, type ActionResult } from "@/lib/actions/result";
import { contributionSchema, savingsGoalSchema, savingsTargetSchema } from "@/lib/validation/savings";
import { uuidSchema } from "@/lib/validation/common";
import { fieldErrorsFrom, friendlyDbError } from "@/lib/actions/_helpers";
import { z } from "zod";

const PATHS = ["/savings", "/dashboard", "/transactions", "/accounts"];
function revalidate() {
  for (const p of PATHS) revalidatePath(p);
}

export async function createSavingsGoalAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = savingsGoalSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      target_amount: Number(parsed.data.targetAmount),
      target_date: parsed.data.targetDate,
      description: parsed.data.description,
      account_id: parsed.data.accountId,
      status: parsed.data.status,
    })
    .select("id")
    .single();
  if (error || !data) return fail(friendlyDbError(error, GENERIC_ERROR));
  revalidate();
  return ok({ id: data.id }, "Goal created.");
}

export async function updateSavingsGoalAction(id: unknown, input: unknown): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return fail("Invalid goal.");
  const parsed = savingsGoalSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .update({
      name: parsed.data.name,
      target_amount: Number(parsed.data.targetAmount),
      target_date: parsed.data.targetDate,
      description: parsed.data.description,
      account_id: parsed.data.accountId,
      status: parsed.data.status,
    })
    .eq("id", idParsed.data)
    .select("id");
  if (error) return fail(friendlyDbError(error, GENERIC_ERROR));
  if (!data || data.length === 0) return fail("Goal not found.");
  revalidate();
  return ok(undefined, "Goal updated.");
}

const statusSchema = z.enum(["active", "completed", "archived"]);

export async function setSavingsGoalStatusAction(id: unknown, status: unknown): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  const statusParsed = statusSchema.safeParse(status);
  if (!idParsed.success || !statusParsed.success) return fail("Invalid request.");
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("savings_goals").update({ status: statusParsed.data }).eq("id", idParsed.data).select("id");
  if (error) return fail(friendlyDbError(error, GENERIC_ERROR));
  if (!data || data.length === 0) return fail("Goal not found.");
  revalidate();
  return ok(undefined, `Goal marked ${statusParsed.data}.`);
}

export async function deleteSavingsGoalAction(id: unknown): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return fail("Invalid goal.");
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("savings_goals").delete().eq("id", idParsed.data).select("id");
  if (error) return fail(friendlyDbError(error, GENERIC_ERROR));
  if (!data || data.length === 0) return fail("Goal not found.");
  revalidate();
  return ok(undefined, "Goal deleted. Linked contributions remain as transfers.");
}

/**
 * Records a contribution as a TRANSFER between the user's own accounts tagged
 * with the goal. Transfers never count as income or expense.
 */
export async function addContributionAction(input: unknown): Promise<ActionResult<{ transactionId: string }>> {
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  if (parsed.data.fromAccountId === parsed.data.toAccountId) {
    return fail("Choose two different accounts.", { toAccountId: ["Choose a different destination account"] });
  }
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: parsed.data.fromAccountId,
      to_account_id: parsed.data.toAccountId,
      category_id: null,
      transaction_type: "transfer",
      amount: Number(parsed.data.amount),
      transaction_date: parsed.data.transactionDate,
      note: parsed.data.note,
      savings_goal_id: parsed.data.goalId,
      payment_method: "bank_transfer",
    })
    .select("id")
    .single();
  if (error || !data) return fail(friendlyDbError(error, GENERIC_ERROR));
  revalidate();
  return ok({ transactionId: data.id }, "Contribution recorded as a transfer.");
}

export async function updateSavingsTargetAction(input: unknown): Promise<ActionResult> {
  const parsed = savingsTargetSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  const user = await requireUser();
  const supabase = await createClient();
  const type = parsed.data.type === "none" ? null : parsed.data.type;
  const value = type ? parsed.data.value : null;
  if (type && value === null) return fail("Enter a target value.", { value: ["Enter a target value"] });
  if (type === "percent" && value !== null && value > 100) return fail("Percent must be 100 or less.", { value: ["Enter 0–100"] });
  const { error } = await supabase
    .from("profiles")
    .update({ savings_target_type: type, savings_target_value: value })
    .eq("id", user.id);
  if (error) return fail(friendlyDbError(error, GENERIC_ERROR));
  revalidate();
  return ok(undefined, "Savings target saved.");
}
