import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/finance/dates";
import { rangeFromSearchParams } from "@/lib/finance/range-params";
import { transactionFiltersSchema } from "@/lib/validation/transactions";
import { listTransactions } from "@/lib/data/transactions";
import { listCategories } from "@/lib/data/categories";
import { listAccounts } from "@/lib/data/accounts";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

export const metadata: Metadata = { title: "Transactions" };

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const { preset, range } = rangeFromSearchParams(params, today, "this_month");

  const parsed = transactionFiltersSchema.safeParse({
    q: str(params.q),
    type: str(params.type),
    categoryId: str(params.categoryId),
    accountId: str(params.accountId),
    paymentMethod: str(params.paymentMethod),
    merchant: str(params.merchant),
    start: range.start,
    end: range.end,
    sort: str(params.sort) ?? "date_desc",
    page: str(params.page) ?? "1",
  });
  const filters = parsed.success ? parsed.data : transactionFiltersSchema.parse({ start: range.start, end: range.end });

  const [page, categories, accounts] = await Promise.all([listTransactions(filters), listCategories(), listAccounts()]);

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page: undefined })) if (v) exportParams.set(k, String(v));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Transactions"
        description="Every expense, income and transfer. Filters apply to the list and the CSV export."
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/api/export/transactions?${exportParams.toString()}`}>
                <Download data-icon="inline-start" /> Export CSV
              </a>
            </Button>
            <Button asChild>
              <Link href="/transactions/new?type=expense">
                <Plus data-icon="inline-start" /> Add transaction
              </Link>
            </Button>
          </>
        }
      />
      <TransactionFilters filters={filters} categories={categories} accounts={accounts} preset={preset} range={range} today={today} />
      <TransactionTable rows={page.rows} categories={categories} accounts={accounts} />
      {page.total > 0 ? <Pagination page={page.page} pageCount={page.pageCount} total={page.total} pageSize={page.pageSize} /> : null}
    </div>
  );
}
