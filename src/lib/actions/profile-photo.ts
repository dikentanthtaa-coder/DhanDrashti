"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;

function sniff(bytes: Uint8Array): { mime: (typeof ALLOWED)[number]; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function uploadProfilePhotoAction(formData: FormData): Promise<ActionResult<{ path: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.");
  if (file.size > MAX_BYTES) return fail("Photos must be 2 MB or smaller.");
  if (!(ALLOWED as readonly string[]).includes(file.type)) return fail("Only JPEG, PNG or WebP images are allowed.");

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_limit_hit", { p_key: "avatar-upload", p_limit: 10, p_window_seconds: 3600 });
  if (allowed === false) return fail("Upload limit reached. Please try again in an hour.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind || kind.mime !== file.type) return fail("The file content does not look like a supported image.");

  const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).maybeSingle();
  const path = `${user.id}/${crypto.randomUUID()}.${kind.ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "3600" });
  if (upErr) return fail("Upload failed. Please try again.");

  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return fail("Could not save the photo. Please try again.");
  }
  if (profile?.avatar_path && profile.avatar_path.startsWith(`${user.id}/`)) {
    await supabase.storage.from(BUCKET).remove([profile.avatar_path]);
  }
  revalidatePath("/", "layout");
  return ok({ path }, "Profile photo updated.");
}

export async function removeProfilePhotoAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (error) return fail("Could not remove the photo.");
  if (profile?.avatar_path && profile.avatar_path.startsWith(`${user.id}/`)) {
    await supabase.storage.from(BUCKET).remove([profile.avatar_path]);
  }
  revalidatePath("/", "layout");
  return ok(undefined, "Profile photo removed.");
}
