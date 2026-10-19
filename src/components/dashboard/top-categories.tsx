import Link from "next/link";
import type { CategoryTotal } from "@/lib/types/database";
import { formatINR, percentOf } from "@/lib/finance/money";
import { CategoryIcon } from "@/components/common/category-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TopCategories({ totals, totalExpense, title = "Top spending categories", limit = 5 }: { totals: CategoryTotal[]; totalExpense: number; title?: string; limit?: number }) {
  const top = totals.filter((t) => Number(t.total) > 0).slice(0, limit);
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Share of net spending in the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses in this period.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {top.map((t, i) => {
              const pct = percentOf(t.total, totalExpense);
              return (
                <li key={t.category_id} className="flex items-center gap-3">
                  <span className="w-4 text-xs text-muted-foreground tabular">{i + 1}</span>
                  <CategoryIcon icon={t.icon} color={t.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/transactions?categoryId=${t.category_id}`} className="block truncate text-sm font-medium hover:underline">
                      {t.category_name}
                    </Link>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: t.color ?? "var(--chart-1)" }} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-sm font-medium">{formatINR(t.total)}</div>
                    <div className="tabular text-xs text-muted-foreground">{pct.toFixed(1)}%</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
