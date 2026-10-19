import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  CreditCard,
  FileText,
  Pencil,
  PiggyBank,
  Repeat,
  Store,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getTransaction } from "@/lib/data/transactions";
import { listCategories, categoryLabel, categoryMap } from "@/lib/data/categories";
import { listAccounts } from "@/lib/data/accounts";
import { amountColorClass, formatDisplayDate, formatPaymentMethod, signedAmount, transactionTypeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/common/category-icon";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { ReceiptUploader } from "@/components/transactions/receipt-uploader";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transaction" };

const UUID_RE = /^[0-9a-f-]{36}$/i;

const TYPE_STYLES = {
  expense: { badge: "bg-expense/15 text-expense", wash: "from-expense/15" },
  income: { badge: "bg-income/15 text-income", wash: "from-income/15" },
  transfer: { badge: "bg-transfer/15 text-transfer", wash: "from-transfer/15" },
} as const;

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [tx, categories, accounts] = await Promise.all([getTransaction(id), listCategories(), listAccounts()]);
  if (!tx) notFound();

  const cats = categoryMap(categories);
  const accts = new Map(accounts.map((a) => [a.id, a]));
  const category = tx.category_id ? cats.get(tx.category_id) : undefined;
  const parent = category?.parent_id ? cats.get(category.parent_id) : undefined;
  const style = TYPE_STYLES[tx.transaction_type];
  const title = tx.merchant || (tx.transaction_type === "transfer" ? "Transfer between accounts" : categoryLabel(cats, tx.category_id));

  const rows: { icon: LucideIcon; label: string; value: React.ReactNode }[] = [
    { icon: CalendarDays, label: "Date", value: formatDisplayDate(tx.transaction_date, "EEEE, d MMMM yyyy") },
    tx.transaction_type === "transfer"
      ? {
          icon: ArrowLeftRight,
          label: "Accounts",
          value: (
            <span className="flex flex-wrap items-center gap-1.5">
              <span>{accts.get(tx.account_id)?.name ?? "—"}</span>
              <ArrowLeftRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{accts.get(tx.to_account_id ?? "")?.name ?? "—"}</span>
            </span>
          ),
        }
      : { icon: Wallet, label: "Account", value: accts.get(tx.account_id)?.name ?? "—" },
    ...(tx.transaction_type !== "transfer"
      ? [
          {
            icon: Tag,
            label: "Category",
            value: (
              <span className="flex items-center gap-2">
                <CategoryIcon icon={category?.icon ?? parent?.icon} color={category?.color ?? parent?.color} size="sm" />
                <span>{categoryLabel(cats, tx.category_id)}</span>
              </span>
            ),
          },
        ]
      : []),
    { icon: CreditCard, label: "Payment method", value: formatPaymentMethod(tx.payment_method) },
    { icon: Store, label: tx.transaction_type === "income" ? "Source / payer" : tx.transaction_type === "transfer" ? "Reference" : "Merchant", value: tx.merchant ?? "—" },
    ...(tx.recurring_transaction_id
      ? [{ icon: Repeat, label: "Created by", value: <Link href="/recurring" className="text-primary underline-offset-4 hover:underline">Recurring schedule</Link> }]
      : []),
    ...(tx.savings_goal_id
      ? [{ icon: PiggyBank, label: "Savings goal", value: <Link href="/savings" className="text-primary underline-offset-4 hover:underline">Counted toward a goal</Link> }]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
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

      {/* Hero */}
      <Card className="overflow-hidden py-0">
        <div className={cn("bg-gradient-to-br to-transparent px-6 pt-6 pb-5", style.wash)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <CategoryIcon icon={category?.icon ?? parent?.icon} color={category?.color ?? parent?.color} size="lg" className="size-14 rounded-2xl [&_svg]:size-7" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("border-0 font-medium", style.badge)}>{transactionTypeLabel(tx.transaction_type, tx.is_refund)}</Badge>
                  {tx.receipt_path ? <Badge variant="outline">Receipt attached</Badge> : null}
                </div>
                <h2 className="mt-1.5 truncate text-xl font-semibold tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground">{formatDisplayDate(tx.transaction_date, "d MMM yyyy")}</p>
              </div>
            </div>
            <div className={cn("tabular shrink-0 text-3xl font-semibold sm:text-right", amountColorClass(tx.transaction_type, tx.is_refund))}>
              {signedAmount(tx.transaction_type, Number(tx.amount), tx.is_refund)}
            </div>
          </div>
        </div>
        <CardContent className="px-6 pb-6">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
                  <r.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{r.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{r.value}</dd>
                </div>
              </div>
            ))}
          </dl>
          {tx.note ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Description</div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{tx.note}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt</CardTitle>
          <CardDescription>Attach a photo or PDF of the bill. Stored privately, only you can open it.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReceiptUploader transactionId={tx.id} receiptPath={tx.receipt_path} />
        </CardContent>
      </Card>
    </div>
  );
}
