"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, ok, GENERIC_ERROR, type ActionResult } from "@/lib/actions/result";
import { uuidSchema } from "@/lib/validation/common";

function revalidate() {
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(id: unknown, read = true): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return fail("Invalid notification.");
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", idParsed.data);
  if (error) return fail(GENERIC_ERROR);
  revalidate();
  return ok(undefined);
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return fail(GENERIC_ERROR);
  revalidate();
  return ok(undefined, "All notifications marked as read.");
}

export async function deleteNotificationAction(id: unknown): Promise<ActionResult> {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return fail("Invalid notification.");
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", idParsed.data);
  if (error) return fail(GENERIC_ERROR);
  revalidate();
  return ok(undefined, "Notification removed.");
}
