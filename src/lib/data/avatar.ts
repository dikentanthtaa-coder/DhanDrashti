import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Short-lived signed URL for the signed-in user's own profile photo (or null). */
export const getAvatarUrl = cache(async (avatarPath: string | null | undefined, userId: string): Promise<string | null> => {
  if (!avatarPath || !avatarPath.startsWith(`${userId}/`)) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").createSignedUrl(avatarPath, 60 * 60);
  return data?.signedUrl ?? null;
});
