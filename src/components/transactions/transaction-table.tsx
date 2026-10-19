import Link from "next/link";
import { ArrowLeftRight, Paperclip, Pencil, ReceiptText } from "lucide-react";
import type { AccountRow, CategoryRow, TransactionRow } from "@/lib/types/database";
import { categoryLabel, categoryMap } from "@/lib/data/categories";
import { amountColorClass, formatDisplayDate, formatPaymentMethod, signedAmount, transactionTypeLabel } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/common/category-icon";
import { EmptyState } from "@/components/common/empty-state";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { cn } from "@/lib/utils";

export function TransactionTable({
  rows,
  categories,
  accounts,
  emptyTitle = "No transactions found",
  emptyDescription = "Try a different filter, or add your first transaction.",
  showActions = true,
}: {
  rows: TransactionRow[];
  categories: CategoryRow[];
  accounts: AccountRow[];
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  showActions?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button asChild>
            <Link href="/transactions/new?type=expense">Add expense</Link>
          </Button>
        }
      />
    );
  }

  const cats = categoryMap(categories);
  const accts = new Map(accounts.map((a) => [a.id, a]));
  const accountName = (id: string | null) => (id ? (accts.get(id)?.name ?? "—") : "—");

  const iconFor = (t: TransactionRow) => {
    if (t.transaction_type === "transfer") return <span className="inline-flex size-8 items-center justify-center rounded-lg bg-transfer/10 text-transfer" aria-hidden="true"><ArrowLeftRight className="size-4" /></span>;
    const c = t.category_id ? cats.get(t.category_id) : undefined;
    const parent = c?.parent_id ? cats.get(c.parent_id) : undefined;
    return <CategoryIcon icon={c?.icon ?? parent?.icon} color={c?.color ?? parent?.color} />;
  };

  const primaryLabel = (t: TransactionRow) =>
    t.transaction_type === "transfer" ? `${accountName(t.account_id)} → ${accountName(t.to_account_id)}` : categoryLabel(cats, t.category_id);

  return (
    <>
      {/* Mobile cards */}
      <ul className="flex flex-col divide-y rounded-xl border md:hidden" aria-label="Transactions">
        {rows.map((t) => (
          <li key={t.id}>
            <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 p-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
              {iconFor(t)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{t.merchant || primaryLabel(t)}</span>
                  {t.receipt_path ? <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-label="Has receipt" /> : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.merchant ? `${primaryLabel(t)} · ` : ""}
                  {formatDisplayDate(t.transaction_date)}
                  {t.is_refund ? " · Refund" : ""}
                </div>
              </div>
              <div className={cn("tabular text-sm font-semibold", amountColorClass(t.transaction_type, t.is_refund))}>
                {signedAmount(t.transaction_type, Number(t.amount), t.is_refund)}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {showActions ? <TableHead className="w-24 text-right"><span className="sr-only">Actions</span></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">{formatDisplayDate(t.transaction_date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {iconFor(t)}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{primaryLabel(t)}</div>
                      <div className="text-xs text-muted-foreground">
                        {transactionTypeLabel(t.transaction_type, t.is_refund)}
                        {t.is_refund ? <Badge variant="outline" className="ml-1.5 text-[10px]">Refund</Badge> : null}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-48">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{t.merchant || <span className="text-muted-foreground">—</span>}</span>
                    {t.receipt_path ? <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-label="Has receipt" /> : null}
                  </div>
                  {t.note ? <div className="truncate text-xs text-muted-foreground">{t.note}</div> : null}
                </TableCell>
                <TableCell className="whitespace-nowrap">{t.transaction_type === "transfer" ? `${accountName(t.account_id)} → ${accountName(t.to_account_id)}` : accountName(t.account_id)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatPaymentMethod(t.payment_method)}</TableCell>
                <TableCell className={cn("tabular text-right font-semibold whitespace-nowrap", amountColorClass(t.transaction_type, t.is_refund))}>
                  {signedAmount(t.transaction_type, Number(t.amount), t.is_refund)}
                </TableCell>
                {showActions ? (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="View transaction">
                        <Link href={`/transactions/${t.id}`}>
                          <ReceiptText />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit transaction">
                        <Link href={`/transactions/${t.id}/edit`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <DeleteTransactionButton id={t.id} />
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
