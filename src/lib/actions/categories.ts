"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { fieldErrorsFromZod, friendlyDbError } from "@/lib/actions/_helpers";
import { categorySchema, reorderCategoriesSchema } from "@/lib/validation/categories";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const PATHS = ["/categories", "/transactions", "/transactions/new", "/budgets", "/dashboard", "/reports"];

function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");

  const supabase = await createClient();
  const { data: siblings } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (siblings?.[0]?.sort_order ?? 1000) + 10;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      parent_id: parsed.data.parentId,
      icon: parsed.data.icon,
      color: parsed.data.color,
      is_system: false,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error || !data) return fail(friendlyDbError(error));
  revalidateAll();
  return ok({ id: data.id }, "Category created.");
}

export async function updateCategoryAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!UUID_RE.test(id)) return fail("Invalid category.");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("categories").select("id, is_system, user_id").eq("id", id).maybeSingle();
  if (!existing || existing.is_system || existing.user_id !== user.id) return fail("Only your own categories can be edited.");

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      parent_id: parsed.data.parentId === id ? null : parsed.data.parentId,
      icon: parsed.data.icon,
      color: parsed.data.color,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return fail(friendlyDbError(error));
  revalidateAll();
  return ok(undefined, "Category updated.");
}

export async function setCategoryArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!UUID_RE.test(id)) return fail("Invalid category.");
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ is_archived: archived }).eq("id", id).eq("user_id", user.id).eq("is_system", false);
  if (error) return fail(friendlyDbError(error));
  revalidateAll();
  return ok(undefined, archived ? "Category archived." : "Category restored.");
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!UUID_RE.test(id)) return fail("Invalid category.");
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id).eq("is_system", false);
  if (error) {
    if (error.code === "23503") return fail("This category is used by transactions, budgets or schedules. Archive it instead.");
    return fail(friendlyDbError(error));
  }
  revalidateAll();
  return ok(undefined, "Category deleted.");
}

/** Persist a new order for the user's own categories (sort_order = index * 10). */
export async function reorderCategoriesAction(input: unknown): Promise<ActionResult> {
  const parsed = reorderCategoriesSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid order.");
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  const supabase = await createClient();
  for (const [index, id] of parsed.data.orderedIds.entries()) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: 1000 + index * 10 })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_system", false);
    if (error) return fail(friendlyDbError(error));
  }
  revalidateAll();
  return ok(undefined, "Order saved.");
}
