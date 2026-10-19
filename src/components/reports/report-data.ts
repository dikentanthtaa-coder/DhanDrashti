import "server-only";

import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { MAX_EXPORT_ROWS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { CategoryRow, CategoryTotal, DailyTotal, MerchantTotal, PaymentMethodTotal } from "@/lib/types/database";
import { daysInRange, previousRange, type DateRange } from "@/lib/finance/dates";
import {
  averageDailyExpense,
  computeTotals,
  highestSpendingDay,
  percentChange,
  savingsRate,
  totalsFromSummary,
  type Totals,
} from "@/lib/finance/calculations";
import { money } from "@/lib/finance/money";
import { getCategoryTotals, getDailyTotals, getMerchantTotals, getPaymentMethodTotals, getPeriodSummary, rollupToParents } from "@/lib/data/reports";
import { listCategories } from "@/lib/data/categories";
import { transactionFiltersSchema, type TransactionFilters } from "@/lib/validation/transactions";

export interface ReportFilters {
  type?: TransactionFilters["type"];
  mainCategoryId?: string;
  subCategoryId?: string;
  accountId?: string;
  paymentMethod?: TransactionFilters["paymentMethod"];
  merchant?: string;
}

export interface ReportData {
  range: DateRange;
  previous: DateRange;
  filters: ReportFilters;
  filtered: boolean;
  capped: boolean;
  totals: Totals;
  previousTotals: Totals;
  changes: { income: number | null; expense: number | null; netCashFlow: number | null };
  averageDaily: Decimal;
  highestDay: DailyTotal | null;
  savingsRate: number | null;
  days: number;
  categoryTotals: CategoryTotal[]; // leaf-level (sub or parent-general)
  parentTotals: CategoryTotal[];
  merchantTotals: MerchantTotal[];
  paymentMethodTotals: PaymentMethodTotal[];
  daily: DailyTotal[];
  categories: CategoryRow[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseReportFilters(params: Record<string, string | string[] | undefined>): ReportFilters {
  const p = transactionFiltersSchema.safeParse({
    type: params.type,
    accountId: params.accountId,
    paymentMethod: params.paymentMethod,
    merchant: params.merchant,
  });
  const base = p.success ? p.data : ({ sort: "date_desc", page: 1 } as TransactionFilters);
  const main = typeof params.mainCategoryId === "string" && UUID.test(params.mainCategoryId) ? params.mainCategoryId : undefined;
  const sub = typeof params.subCategoryId === "string" && UUID.test(params.subCategoryId) ? params.subCategoryId : undefined;
  return {
    type: base.type,
    mainCategoryId: main,
    subCategoryId: sub,
    accountId: base.accountId,
    paymentMethod: base.paymentMethod,
    merchant: base.merchant || undefined,
  };
}

function hasExtraFilters(f: ReportFilters): boolean {
  return Boolean(f.type || f.mainCategoryId || f.subCategoryId || f.accountId || f.paymentMethod || f.merchant);
}

interface SlimTx {
  transaction_type: "income" | "expense" | "transfer";
  amount: number;
  is_refund: boolean;
  category_id: string | null;
  merchant: string | null;
  payment_method: string | null;
  transaction_date: string;
}

async function fetchFiltered(range: DateRange, f: ReportFilters, categories: CategoryRow[]): Promise<{ rows: SlimTx[]; capped: boolean }> {
  const supabase = await createClient();
  let q = supabase
    .from("transactions")
    .select("transaction_type, amount, is_refund, category_id, merchant, payment_method, transaction_date")
    .gte("transaction_date", range.start)
    .lte("transaction_date", range.end);
  if (f.type === "refund") q = q.eq("transaction_type", "expense").eq("is_refund", true);
  else if (f.type) q = q.eq("transaction_type", f.type);
  if (f.subCategoryId) q = q.eq("category_id", f.subCategoryId);
  else if (f.mainCategoryId) {
    const ids = [f.mainCategoryId, ...categories.filter((c) => c.parent_id === f.mainCategoryId).map((c) => c.id)];
    q = q.in("category_id", ids);
  }
  if (f.accountId) q = q.or(`account_id.eq.${f.accountId},to_account_id.eq.${f.accountId}`);
  if (f.paymentMethod) q = q.eq("payment_method", f.paymentMethod);
  if (f.merchant) q = q.ilike("merchant", `%${f.merchant.replace(/[%_\\]/g, (m) => `\\${m}`).replace(/[(),]/g, " ")}%`);
  const rows: SlimTx[] = [];
  const chunk = 1000;
  let from = 0;
  let capped = false;
  while (from < MAX_EXPORT_ROWS) {
    const { data, error } = await q.order("transaction_date", { ascending: true }).range(from, from + chunk - 1);
    if (error) throw new Error("Could not load report data");
    rows.push(...((data ?? []) as SlimTx[]));
    if (!data || data.length < chunk) break;
    from += chunk;
    if (from >= MAX_EXPORT_ROWS) capped = true;
  }
  return { rows, capped };
}

function aggregateFiltered(rows: SlimTx[], categories: CategoryRow[]) {
  const cmap = new Map(categories.map((c) => [c.id, c]));
  const net = (t: SlimTx) => (t.is_refund ? -t.amount : t.amount);
  const byCat = new Map<string, CategoryTotal>();
  const byDay = new Map<string, DailyTotal>();
  const byMerchant = new Map<string, MerchantTotal>();
  const byMethod = new Map<string, PaymentMethodTotal>();
  for (const t of rows) {
    const d = byDay.get(t.transaction_date) ?? { day: t.transaction_date, income: 0, expense: 0 };
    if (t.transaction_type === "income") d.income = money(d.income).plus(t.amount).toNumber();
    if (t.transaction_type === "expense") d.expense = money(d.expense).plus(net(t)).toNumber();
    byDay.set(t.transaction_date, d);
    if (t.transaction_type !== "expense") continue;
    if (t.category_id) {
      const c = cmap.get(t.category_id);
      const parent = c?.parent_id ? cmap.get(c.parent_id) : null;
      const e = byCat.get(t.category_id) ?? {
        category_id: t.category_id,
        category_name: c?.name ?? "Unknown",
        parent_id: c?.parent_id ?? null,
        parent_name: parent?.name ?? null,
        icon: c?.icon ?? parent?.icon ?? null,
        color: c?.color ?? parent?.color ?? null,
        total: 0,
        tx_count: 0,
      };
      e.total = money(e.total).plus(net(t)).toNumber();
      e.tx_count += 1;
      byCat.set(t.category_id, e);
    }
    if (t.merchant && t.merchant.trim()) {
      const m = byMerchant.get(t.merchant) ?? { merchant: t.merchant, total: 0, tx_count: 0 };
      m.total = money(m.total).plus(net(t)).toNumber();
      m.tx_count += 1;
      byMerchant.set(t.merchant, m);
    }
    const key = t.payment_method ?? "other";
    const pm = byMethod.get(key) ?? { payment_method: key, total: 0, tx_count: 0 };
    pm.total = money(pm.total).plus(net(t)).toNumber();
    pm.tx_count += 1;
    byMethod.set(key, pm);
  }
  const desc = <T extends { total: number }>(a: T, b: T) => b.total - a.total;
  return {
    categoryTotals: [...byCat.values()].sort(desc),
    daily: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    merchantTotals: [...byMerchant.values()].sort(desc).slice(0, 25),
    paymentMethodTotals: [...byMethod.values()].sort(desc),
  };
}

export async function buildReport(range: DateRange, filters: ReportFilters): Promise<ReportData> {
  const previous = previousRange(range);
  const categories = await listCategories();
  const filtered = hasExtraFilters(filters);
  const days = daysInRange(range);

  let totals: Totals;
  let previousTotals: Totals;
  let categoryTotals: CategoryTotal[];
  let daily: DailyTotal[];
  let merchantTotals: MerchantTotal[];
  let paymentMethodTotals: PaymentMethodTotal[];
  let capped = false;

  if (!filtered) {
    const [summary, prevSummary, cats, dl, merchants, methods] = await Promise.all([
      getPeriodSummary(range),
      getPeriodSummary(previous),
      getCategoryTotals(range, "expense"),
      getDailyTotals(range),
      getMerchantTotals(range, 25),
      getPaymentMethodTotals(range),
    ]);
    totals = totalsFromSummary(summary);
    previousTotals = totalsFromSummary(prevSummary);
    categoryTotals = cats;
    daily = dl;
    merchantTotals = merchants;
    paymentMethodTotals = methods;
  } else {
    const [cur, prev] = await Promise.all([fetchFiltered(range, filters, categories), fetchFiltered(previous, filters, categories)]);
    capped = cur.capped || prev.capped;
    totals = computeTotals(cur.rows);
    previousTotals = computeTotals(prev.rows);
    const agg = aggregateFiltered(cur.rows, categories);
    categoryTotals = agg.categoryTotals;
    daily = agg.daily;
    merchantTotals = agg.merchantTotals;
    paymentMethodTotals = agg.paymentMethodTotals;
  }

  return {
    range,
    previous,
    filters,
    filtered,
    capped,
    totals,
    previousTotals,
    changes: {
      income: percentChange(totals.income, previousTotals.income),
      expense: percentChange(totals.netExpense, previousTotals.netExpense),
      netCashFlow: percentChange(totals.netCashFlow, previousTotals.netCashFlow),
    },
    averageDaily: averageDailyExpense(totals.netExpense, days),
    highestDay: highestSpendingDay(daily),
    savingsRate: savingsRate(totals.income, totals.netExpense),
    days,
    categoryTotals,
    parentTotals: rollupToParents(categoryTotals),
    merchantTotals,
    paymentMethodTotals: paymentMethodTotals.map((p) => ({ ...p, payment_method: p.payment_method })),
    daily,
    categories,
  };
}

export function paymentMethodLabel(key: string): string {
  return PAYMENT_METHOD_LABELS[key] ?? key;
}
