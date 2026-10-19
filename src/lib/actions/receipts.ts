"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { friendlyDbError } from "@/lib/actions/_helpers";
import { RECEIPT_ALLOWED_TYPES, RECEIPT_BUCKET, RECEIPT_MAX_BYTES, RECEIPT_SIGNED_URL_SECONDS } from "@/lib/constants";

const UUID_RE = /^[0-9a-f-]{36}$/i;

type SniffedType = { mime: (typeof RECEIPT_ALLOWED_TYPES)[number]; ext: "jpg" | "png" | "webp" | "pdf" };

/** Detect the real file type from magic bytes; never trust the client's MIME or filename. */
function sniffType(bytes: Uint8Array): SniffedType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

async function ownedTransaction(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("id, user_id, receipt_path").eq("id", id).maybeSingle();
  return { supabase, tx: data };
}

export async function uploadReceiptAction(transactionId: string, formData: FormData): Promise<ActionResult<{ path: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (typeof transactionId !== "string" || !UUID_RE.test(transactionId)) return fail("Invalid transaction.");

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Choose a file to upload.");
  if (file.size === 0) return fail("The file is empty.");
  if (file.size > RECEIPT_MAX_BYTES) return fail("Receipts must be 5 MB or smaller.");
  if (!(RECEIPT_ALLOWED_TYPES as readonly string[]).includes(file.type)) return fail("Only JPEG, PNG, WebP images or PDF files are allowed.");

  const { supabase, tx } = await ownedTransaction(transactionId);
  if (!tx || tx.user_id !== user.id) return fail("Transaction not found.");

  const { data: allowed } = await supabase.rpc("rate_limit_hit", { p_key: "receipt-upload", p_limit: 30, p_window_seconds: 3600 });
  if (allowed === false) return fail("Upload limit reached. Please try again in an hour.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffType(bytes);
  if (!sniffed || sniffed.mime !== file.type) return fail("The file content does not match a supported receipt type.");

  const path = `${user.id}/${transactionId}/${crypto.randomUUID()}.${sniffed.ext}`;
  const { error: uploadError } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, bytes, {
    contentType: sniffed.mime,
    upsert: false,
    cacheControl: "0",
  });
  if (uploadError) return fail("Upload failed. Please try again.");

  const { error } = await supabase.from("transactions").update({ receipt_path: path }).eq("id", transactionId).eq("user_id", user.id);
  if (error) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
    return fail(friendlyDbError(error));
  }

  if (tx.receipt_path && tx.receipt_path !== path && tx.receipt_path.startsWith(`${user.id}/`)) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([tx.receipt_path]);
  }

  revalidatePath(`/transactions/${transactionId}`);
  revalidatePath("/transactions");
  return ok({ path }, "Receipt uploaded.");
}

export async function getReceiptUrlAction(transactionId: string): Promise<ActionResult<{ url: string; isPdf: boolean; expiresInSeconds: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (typeof transactionId !== "string" || !UUID_RE.test(transactionId)) return fail("Invalid transaction.");

  const { supabase, tx } = await ownedTransaction(transactionId);
  if (!tx || tx.user_id !== user.id || !tx.receipt_path) return fail("No receipt attached.");
  if (!tx.receipt_path.startsWith(`${user.id}/`)) return fail("No receipt attached.");

  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(tx.receipt_path, RECEIPT_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return fail("Could not open the receipt right now.");
  return ok({ url: data.signedUrl, isPdf: tx.receipt_path.endsWith(".pdf"), expiresInSeconds: RECEIPT_SIGNED_URL_SECONDS });
}

export async function deleteReceiptAction(transactionId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (typeof transactionId !== "string" || !UUID_RE.test(transactionId)) return fail("Invalid transaction.");

  const { supabase, tx } = await ownedTransaction(transactionId);
  if (!tx || tx.user_id !== user.id) return fail("Transaction not found.");
  if (!tx.receipt_path) return ok(undefined, "No receipt to remove.");

  const { error } = await supabase.from("transactions").update({ receipt_path: null }).eq("id", transactionId).eq("user_id", user.id);
  if (error) return fail(friendlyDbError(error));
  if (tx.receipt_path.startsWith(`${user.id}/`)) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([tx.receipt_path]);
  }
  revalidatePath(`/transactions/${transactionId}`);
  revalidatePath("/transactions");
  return ok(undefined, "Receipt removed.");
}
