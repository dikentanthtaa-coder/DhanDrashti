import type { Metadata } from "next";
import { requireUserWithProfile } from "@/lib/auth/session";
import { formatDisplayDate, todayInTimezone } from "@/lib/finance/dates";
import { rangeFromSearchParams } from "@/lib/finance/range-params";
import { formatINR } from "@/lib/finance/money";
import { buildReport, parseReportFilters } from "@/components/reports/report-data";
import { PAYMENT_METHOD_LABELS, APP_NAME } from "@/lib/constants";
import { PrintButton } from "@/components/reports/print-button";
import { listAccounts } from "@/lib/data/accounts";

export const metadata: Metadata = { title: "Print report" };

export default async function PrintReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { profile, timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const { range } = rangeFromSearchParams(params, today, "this_month");
  const filters = parseReportFilters(params);
  const [report, accounts] = await Promise.all([buildReport(range, filters), listAccounts()]);
  const t = report.totals;
  const cmap = new Map(report.categories.map((c) => [c.id, c.name]));
  const activeFilters: string[] = [];
  if (filters.type) activeFilters.push(`Type: ${filters.type}`);
  if (filters.mainCategoryId) activeFilters.push(`Category: ${cmap.get(filters.mainCategoryId) ?? "?"}`);
  if (filters.subCategoryId) activeFilters.push(`Subcategory: ${cmap.get(filters.subCategoryId) ?? "?"}`);
  if (filters.accountId) activeFilters.push(`Account: ${accounts.find((a) => a.id === filters.accountId)?.name ?? "?"}`);
  if (filters.paymentMethod) activeFilters.push(`Payment: ${PAYMENT_METHOD_LABELS[filters.paymentMethod]}`);
  if (filters.merchant) activeFilters.push(`Merchant: ${filters.merchant}`);

  return (
    <article className="mx-auto max-w-3xl bg-background text-foreground print:max-w-none">
      <header className="mb-4 flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-xs text-muted-foreground">{APP_NAME} · Financial report</p>
          <h1 className="text-2xl font-semibold">
            {formatDisplayDate(range.start)} – {formatDisplayDate(range.end)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Prepared for {profile.display_name || "you"} on {formatDisplayDate(today, "d MMM yyyy")}
            {activeFilters.length ? ` · Filters: ${activeFilters.join(", ")}` : ""}
          </p>
        </div>
        <PrintButton />
      </header>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-base font-semibold">Summary</h2>
        <table className="text-sm">
          <tbody>
            <Row label="Total income" value={formatINR(t.income)} />
            <Row label="Total expenses (net of refunds)" value={formatINR(t.netExpense)} />
            <Row label="Refunds" value={formatINR(t.refunds)} />
            <Row label="Net cash flow" value={formatINR(t.netCashFlow)} />
            <Row label="Transfers between accounts" value={formatINR(t.transfers)} />
            <Row label="Average daily expense" value={formatINR(report.averageDaily)} />
            <Row label="Highest-spending day" value={report.highestDay ? `${formatDisplayDate(report.highestDay.day)} · ${formatINR(report.highestDay.expense)}` : "—"} />
            <Row label="Savings rate" value={report.savingsRate === null ? "— (no income)" : `${report.savingsRate.toFixed(1)}%`} />
            <Row label="Previous period expenses" value={formatINR(report.previousTotals.netExpense)} />
            <Row label="Change in expenses" value={report.changes.expense === null ? "—" : `${report.changes.expense > 0 ? "+" : ""}${report.changes.expense.toFixed(1)}%`} />
          </tbody>
        </table>
      </section>

      <Section title="Category totals" header="Category" rows={report.parentTotals.map((c) => ({ name: c.category_name, count: Number(c.tx_count), total: Number(c.total) }))} />
      <Section title="Subcategory totals" header="Subcategory" rows={report.categoryTotals.map((c) => ({ name: c.parent_name ? `${c.parent_name} › ${c.category_name}` : c.category_name, count: Number(c.tx_count), total: Number(c.total) }))} />
      <Section title="Merchant totals" header="Merchant" rows={report.merchantTotals.map((m) => ({ name: m.merchant, count: Number(m.tx_count), total: Number(m.total) }))} />
      <Section title="Payment-method totals" header="Payment method" rows={report.paymentMethodTotals.map((p) => ({ name: PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method, count: Number(p.tx_count), total: Number(p.total) }))} />

      <footer className="mt-8 border-t pt-3 text-xs text-muted-foreground">
        Accounting policy: income counts as income; expenses count as spending; refunds reduce spending in their category; transfers between your own accounts are excluded.
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 pr-6">{label}</td>
      <td className="tabular py-1 text-right font-medium">{value}</td>
    </tr>
  );
}
function Section({ title, header, rows }: { title: string; header: string; rows: { name: string; count: number; total: number }[] }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mt-6 mb-2 text-base font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 font-medium">{header}</th>
              <th className="py-1 text-right font-medium">Transactions</th>
              <th className="py-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-dotted">
                <td className="py-1">{r.name}</td>
                <td className="tabular py-1 text-right">{r.count}</td>
                <td className="tabular py-1 text-right">{formatINR(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

