import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CSV_BOM, toCsvRow } from "@/lib/csv";
import { MAX_EXPORT_ROWS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { todayInTimezone } from "@/lib/finance/dates";
import { rangeFromSearchParams } from "@/lib/finance/range-params";
import { transactionFiltersSchema } from "@/lib/validation/transactions";
import { buildReport, parseReportFilters } from "@/components/reports/report-data";
import { toFixed2 } from "@/lib/finance/money";
import type { CategoryRow, TransactionRow } from "@/lib/types/database";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export const dynamic = "force-dynamic";

const HEADER = ["Date", "Type", "Amount", "Currency", "Category", "Subcategory", "Account", "To Account", "Payment Method", "Merchant", "Note", "Receipt", "Created At"];
const NUMERIC_COLUMNS = new Set([2]);
const CHUNK = 1000;

function typeLabel(t: TransactionRow): string {
  if (t.transaction_type === "expense") return t.is_refund ? "Refund" : "Expense";
  return t.transaction_type === "income" ? "Income" : "Transfer";
}

function searchParamsToRecord(sp: URLSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/**
 * GET /api/export/transactions?preset=&start=&end=&type=&categoryId=&accountId=&paymentMethod=&merchant=&q=
 * GET /api/export/transactions?summary=1&...   (report summary sections)
 * Streams UTF-8 CSV (with BOM) for the signed-in user only. RLS guarantees isolation.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: allowed } = await supabase.rpc("rate_limit_hit", { p_key: "csv-export", p_limit: 20, p_window_seconds: 3600 });
  if (allowed === false) return new Response("Too many exports. Please try again later.", { status: 429 });

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const today = todayInTimezone(profile?.timezone ?? DEFAULT_TIMEZONE);
  const params = searchParamsToRecord(request.nextUrl.searchParams);
  const { range } = rangeFromSearchParams(params, today, "this_month");
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });

  if (params.summary === "1") {
    const report = await buildReport(range, parseReportFilters(params));
    headers.set("Content-Disposition", `attachment; filename="dhandrashti-summary-${range.start}_${range.end}.csv"`);
    const lines: string[] = [CSV_BOM + "DhanDrashti report summary"];
    lines.push(toCsvRow(["Period", `${range.start} to ${range.end}`]));
    lines.push("");
    lines.push(toCsvRow(["Metric", "Amount"]));
    const metric = (label: string, v: string | number | null) => lines.push(toCsvRow([label, v ?? ""], new Set([1])));
    metric("Total income", toFixed2(report.totals.income));
    metric("Total expenses (net of refunds)", toFixed2(report.totals.netExpense));
    metric("Refunds", toFixed2(report.totals.refunds));
    metric("Net cash flow", toFixed2(report.totals.netCashFlow));
    metric("Transfers", toFixed2(report.totals.transfers));
    metric("Average daily expense", toFixed2(report.averageDaily));
    metric("Highest-spending day", report.highestDay ? `${report.highestDay.day} (${toFixed2(report.highestDay.expense)})` : "");
    metric("Savings rate %", report.savingsRate === null ? "" : report.savingsRate);
    metric("Previous period expenses", toFixed2(report.previousTotals.netExpense));
    metric("Expense change %", report.changes.expense ?? "");
    lines.push("");
    lines.push(toCsvRow(["Category", "Transactions", "Amount"]));
    for (const c of report.parentTotals) lines.push(toCsvRow([c.category_name, c.tx_count, toFixed2(c.total)], new Set([1, 2])));
    lines.push("");
    lines.push(toCsvRow(["Subcategory", "Parent", "Transactions", "Amount"]));
    for (const c of report.categoryTotals) lines.push(toCsvRow([c.category_name, c.parent_name ?? "", c.tx_count, toFixed2(c.total)], new Set([2, 3])));
    lines.push("");
    lines.push(toCsvRow(["Merchant", "Transactions", "Amount"]));
    for (const m of report.merchantTotals) lines.push(toCsvRow([m.merchant, m.tx_count, toFixed2(m.total)], new Set([1, 2])));
    lines.push("");
    lines.push(toCsvRow(["Payment method", "Transactions", "Amount"]));
    for (const p of report.paymentMethodTotals) lines.push(toCsvRow([PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method, p.tx_count, toFixed2(p.total)], new Set([1, 2])));
    if (report.capped) lines.push(`# summary computed from the first ${MAX_EXPORT_ROWS} matching transactions`);
    return new Response(lines.join("\r\n") + "\r\n", { headers });
  }

  const parsed = transactionFiltersSchema.safeParse({
    q: params.q,
    type: params.type,
    categoryId: params.categoryId ?? params.subCategoryId ?? params.mainCategoryId,
    accountId: params.accountId,
    paymentMethod: params.paymentMethod,
    merchant: params.merchant,
    sort: "date_asc",
  });
  if (!parsed.success) return new Response("Invalid filters", { status: 400 });
  const f = parsed.data;

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id"),
    supabase.from("accounts").select("id, name"),
  ]);
  const cmap = new Map<string, Pick<CategoryRow, "id" | "name" | "parent_id">>((categories ?? []).map((c) => [c.id, c]));
  const amap = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  // A main-category filter from the Reports page includes its subcategories.
  const categoryIds =
    f.categoryId && !params.subCategoryId && params.mainCategoryId
      ? [f.categoryId, ...(categories ?? []).filter((c) => c.parent_id === f.categoryId).map((c) => c.id)]
      : f.categoryId
        ? [f.categoryId]
        : null;

  headers.set("Content-Disposition", `attachment; filename="dhandrashti-transactions-${range.start}_${range.end}.csv"`);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (line: string) => controller.enqueue(encoder.encode(line + "\r\n"));
      write(CSV_BOM + toCsvRow(HEADER));
      let from = 0;
      let written = 0;
      let truncated = false;
      try {
        while (true) {
          let query = supabase
            .from("transactions")
            .select("*")
            .gte("transaction_date", range.start)
            .lte("transaction_date", range.end)
            .order("transaction_date", { ascending: true })
            .order("created_at", { ascending: true })
            .range(from, from + CHUNK - 1);
          if (f.type === "refund") query = query.eq("transaction_type", "expense").eq("is_refund", true);
          else if (f.type) query = query.eq("transaction_type", f.type);
          if (categoryIds) query = query.in("category_id", categoryIds);
          if (f.accountId) query = query.or(`account_id.eq.${f.accountId},to_account_id.eq.${f.accountId}`);
          if (f.paymentMethod) query = query.eq("payment_method", f.paymentMethod);
          if (f.merchant) query = query.ilike("merchant", `%${f.merchant.replace(/[%_\\]/g, (m) => `\\${m}`).replace(/[(),]/g, " ")}%`);
          if (f.q) {
            const term = `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`).replace(/[(),]/g, " ")}%`;
            query = query.or(`merchant.ilike.${term},note.ilike.${term}`);
          }
          const { data, error } = await query;
          if (error) throw error;
          for (const t of data ?? []) {
            if (written >= MAX_EXPORT_ROWS) {
              truncated = true;
              break;
            }
            const cat = t.category_id ? cmap.get(t.category_id) : null;
            const parent = cat?.parent_id ? cmap.get(cat.parent_id) : null;
            write(
              toCsvRow(
                [
                  t.transaction_date,
                  typeLabel(t),
                  toFixed2(t.amount),
                  t.currency,
                  parent ? parent.name : (cat?.name ?? ""),
                  parent ? cat?.name ?? "" : "",
                  amap.get(t.account_id) ?? "",
                  t.to_account_id ? (amap.get(t.to_account_id) ?? "") : "",
                  t.payment_method ? (PAYMENT_METHOD_LABELS[t.payment_method] ?? t.payment_method) : "",
                  t.merchant ?? "",
                  t.note ?? "",
                  t.receipt_path ? "yes" : "no",
                  t.created_at,
                ],
                NUMERIC_COLUMNS
              )
            );
            written += 1;
          }
          if (truncated || !data || data.length < CHUNK) break;
          from += CHUNK;
        }
        if (truncated) write(`# export truncated at ${MAX_EXPORT_ROWS} rows`);
      } catch {
        write("# export failed before completion");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
