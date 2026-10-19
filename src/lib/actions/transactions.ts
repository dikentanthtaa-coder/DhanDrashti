"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { fieldErrorsFromZod, friendlyDbError } from "@/lib/actions/_helpers";
import { transactionSchema } from "@/lib/validation/transactions";
import { runBudgetAlerts } from "@/lib/budget-alerts";
import { RECEIPT_BUCKET } from "@/lib/constants";
import type { TransactionRow } from "@/lib/types/database";

const REVALIDATE_PATHS = ["/transactions", "/dashboard", "/budgets", "/reports", "/savings", "/accounts", "/recurring"];

function revalidateAll(id?: string) {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  if (id) revalidatePath(`/transactions/${id}`);
}

function toRow(values: ReturnType<typeof transactionSchema.parse>, userId: string) {
  const isTransfer = values.transactionType === "transfer";
  return {
    user_id: userId,
    transaction_type: values.transactionType,
    amount: Number(values.amount),
    transaction_date: values.transactionDate,
    account_id: values.accountId,
    to_account_id: isTransfer ? values.toAccountId : null,
    category_id: isTransfer ? null : values.categoryId,
    payment_method: values.paymentMethod,
    merchant: values.merchant,
    note: values.note,
    is_refund: values.transactionType === "expense" ? values.isRefund : false,
    savings_goal_id: values.transactionType === "expense" ? null : values.savingsGoalId,
    currency: "INR",
  };
}

function affectsBudgets(t: Pick<TransactionRow, "transaction_type">): boolean {
  return t.transaction_type === "expense";
}

export async function createTransactionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").insert(toRow(parsed.data, user.id)).select("id").single();
  if (error || !data) return fail(friendlyDbError(error));

  if (parsed.data.transactionType === "expense") await runBudgetAlerts(parsed.data.transactionDate);
  revalidateAll(data.id);
  return ok({ id: data.id }, "Transaction saved.");
}

export async function updateTransactionAction(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid transaction.");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (!existing) return fail("Transaction not found.");

  const { user_id: _ignored, ...row } = toRow(parsed.data, user.id);
  void _ignored;
  const { error } = await supabase.from("transactions").update(row).eq("id", id).eq("user_id", user.id);
  if (error) return fail(friendlyDbError(error));

  if (affectsBudgets(existing) || parsed.data.transactionType === "expense") {
    await runBudgetAlerts(parsed.data.transactionDate);
    if (existing.transaction_date.slice(0, 7) !== parsed.data.transactionDate.slice(0, 7)) {
      await runBudgetAlerts(existing.transaction_date);
    }
  }
  revalidateAll(id);
  return ok({ id }, "Transaction updated.");
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid transaction.");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (!existing) return fail("Transaction not found.");

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(friendlyDbError(error));

  // Remove the receipt only when it lives inside this user's folder.
  if (existing.receipt_path && existing.receipt_path.startsWith(`${user.id}/`)) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([existing.receipt_path]);
  }
  if (affectsBudgets(existing)) await runBudgetAlerts(existing.transaction_date);
  revalidateAll(id);
  return ok(undefined, "Transaction deleted.");
}
