import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getTransaction } from "@/lib/data/transactions";
import { listCategories, categoryLabel, categoryMap } from "@/lib/data/categories";
import { listAccounts } from "@/lib/data/accounts";
import { amountColorClass, formatDisplayDate, formatPaymentMethod, signedAmount, transactionTypeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/common/category-icon";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { ReceiptUploader } from "@/components/transactions/receipt-uploader";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transaction" };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [tx, categories, accounts] = await Promise.all([getTransaction(id), listCategories(), listAccounts()]);
  if (!tx) notFound();

  const cats = categoryMap(categories);
  const accts = new Map(accounts.map((a) => [a.id, a]));
  const category = tx.category_id ? cats.get(tx.category_id) : undefined;
  const parent = category?.parent_id ? cats.get(category.parent_id) : undefined;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Type", value: <Badge variant="outline">{transactionTypeLabel(tx.transaction_type, tx.is_refund)}</Badge> },
    { label: "Date", value: formatDisplayDate(tx.transaction_date, "EEEE, d MMMM yyyy") },
    tx.transaction_type === "transfer"
      ? { label: "Accounts", value: `${accts.get(tx.account_id)?.name ?? "—"} → ${accts.get(tx.to_account_id ?? "")?.name ?? "—"}` }
      : { label: "Account", value: accts.get(tx.account_id)?.name ?? "—" },
    ...(tx.transaction_type !== "transfer" ? [{ label: "Category", value: categoryLabel(cats, tx.category_id) }] : []),
    { label: "Payment method", value: formatPaymentMethod(tx.payment_method) },
    { label: tx.transaction_type === "income" ? "Source" : "Merchant", value: tx.merchant ?? "—" },
    { label: "Description", value: tx.note ? <span className="whitespace-pre-wrap">{tx.note}</span> : "—" },
    ...(tx.recurring_transaction_id ? [{ label: "Source", value: <Link href="/recurring" className="underline underline-offset-4">Recurring schedule</Link> }] : []),
    ...(tx.savings_goal_id ? [{ label: "Savings goal", value: <Link href="/savings" className="underline underline-offset-4">Linked goal contribution</Link> }] : []),
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="no-print flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/transactions">
            <ArrowLeft data-icon="inline-start" /> All transactions
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/transactions/${tx.id}/edit`}>
              <Pencil data-icon="inline-start" /> Edit
            </Link>
          </Button>
          <DeleteTransactionButton id={tx.id} redirectTo="/transactions" size="sm" label="Delete" />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CategoryIcon icon={category?.icon ?? parent?.icon} color={category?.color ?? parent?.color} size="lg" />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{tx.merchant || (tx.transaction_type === "transfer" ? "Transfer" : categoryLabel(cats, tx.category_id))}</CardTitle>
            <p className="text-sm text-muted-foreground">{formatDisplayDate(tx.transaction_date)}</p>
          </div>
          <div className={cn("tabular text-2xl font-semibold", amountColorClass(tx.transaction_type, tx.is_refund))}>
            {signedAmount(tx.transaction_type, Number(tx.amount), tx.is_refund)}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
                <dd className="text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptUploader transactionId={tx.id} receiptPath={tx.receipt_path} />
        </CardContent>
      </Card>
    </div>
  );
}
