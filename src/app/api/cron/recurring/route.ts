import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Scheduled recurring-transaction processor (Vercel Cron: see vercel.json).
 * Protected by CRON_SECRET; uses the server-only secret key to process every
 * user's due schedules through the idempotent SQL function.
 */
function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not configured" }, { status: 503 });
  }

  const { data, error } = await admin.rpc("process_all_recurring_transactions");
  if (error) {
    console.error("[cron:recurring] processing failed", error.code ?? "unknown");
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  const rows = data ?? [];
  const summary = rows.reduce(
    (acc, r) => ({
      processedUsers: acc.processedUsers + 1,
      posted: acc.posted + Number(r.posted),
      reminders: acc.reminders + Number(r.reminders),
      completed: acc.completed + Number(r.completed),
    }),
    { processedUsers: 0, posted: 0, reminders: 0, completed: 0 }
  );
  console.info("[cron:recurring] done", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
