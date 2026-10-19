import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import type { AccountRow, CategoryRow, TransactionRow } from "@/lib/types/database";
import { categoryLabel, categoryMap } from "@/lib/data/categories";
import { amountColorClass, formatDisplayDate, signedAmount, transactionTypeLabel } from "@/lib/format";
import { CategoryIcon } from "@/components/common/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

export function RecentTransactions({
  transactions,
  categories,
  accounts,
}: {
  transactions: TransactionRow[];
  categories: CategoryRow[];
  accounts: AccountRow[];
}) {
  const cmap = categoryMap(categories);
  const amap = new Map(accounts.map((a) => [a.id, a]));
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent transactions</CardTitle>
        <Button asChild variant="ghost" size="sm" className="no-print">
          <Link href="/transactions">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        {transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Add your first expense or income to see it here."
            action={
              <Button asChild size="sm">
                <Link href="/transactions/new?type=expense">
                  <Plus data-icon="inline-start" /> Add transaction
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y">
            {transactions.map((t) => {
              const cat = t.category_id ? cmap.get(t.category_id) : null;
              const parent = cat?.parent_id ? cmap.get(cat.parent_id) : null;
              const label =
                t.transaction_type === "transfer"
                  ? `Transfer → ${amap.get(t.to_account_id ?? "")?.name ?? "account"}`
                  : t.merchant || categoryLabel(cmap, t.category_id);
              return (
                <li key={t.id}>
                  <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                    <CategoryIcon icon={cat?.icon ?? parent?.icon ?? (t.transaction_type === "transfer" ? "wallet" : null)} color={cat?.color ?? parent?.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatDisplayDate(t.transaction_date)} · {transactionTypeLabel(t.transaction_type, t.is_refund)}
                        {t.transaction_type !== "transfer" && t.merchant ? ` · ${categoryLabel(cmap, t.category_id)}` : ""}
                      </div>
                    </div>
                    <div className={cn("tabular text-sm font-medium", amountColorClass(t.transaction_type, t.is_refund))}>
                      {signedAmount(t.transaction_type, t.amount, t.is_refund)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
