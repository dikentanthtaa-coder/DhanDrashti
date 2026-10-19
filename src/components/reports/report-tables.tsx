import type { CategoryTotal, MerchantTotal, PaymentMethodTotal } from "@/lib/types/database";
import { formatINR, percentOf } from "@/lib/finance/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { CategoryIcon } from "@/components/common/category-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function TotalsTable({ rows, total, nameHeader }: { rows: { key: string; name: React.ReactNode; total: number; count: number }[]; total: number; nameHeader: string }) {
  if (rows.length === 0) return <p className="px-2 text-sm text-muted-foreground">Nothing to show for this selection.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{nameHeader}</TableHead>
          <TableHead className="text-right">Transactions</TableHead>
          <TableHead className="text-right">Share</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="tabular text-right text-muted-foreground">{r.count}</TableCell>
            <TableCell className="tabular text-right text-muted-foreground">{percentOf(r.total, total).toFixed(1)}%</TableCell>
            <TableCell className="tabular text-right">{formatINR(r.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CategoryTotalsTable({ parents, leaves, totalExpense }: { parents: CategoryTotal[]; leaves: CategoryTotal[]; totalExpense: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">Category totals</CardTitle>
          <CardDescription>Main categories including their subcategories.</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          <TotalsTable
            nameHeader="Category"
            total={totalExpense}
            rows={parents.map((p) => ({
              key: p.category_id,
              name: (
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={p.icon} color={p.color} size="sm" />
                  {p.category_name}
                </span>
              ),
              total: Number(p.total),
              count: Number(p.tx_count),
            }))}
          />
        </CardContent>
      </Card>
      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-base">Subcategory totals</CardTitle>
          <CardDescription>Most specific category on each transaction.</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          <TotalsTable
            nameHeader="Subcategory"
            total={totalExpense}
            rows={leaves.map((c) => ({
              key: c.category_id,
              name: (
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <span>
                    {c.parent_name ? <span className="text-muted-foreground">{c.parent_name} › </span> : null}
                    {c.category_name}
                  </span>
                </span>
              ),
              total: Number(c.total),
              count: Number(c.tx_count),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function MerchantTotalsTable({ rows, totalExpense }: { rows: MerchantTotal[]; totalExpense: number }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">Merchant totals</CardTitle>
        <CardDescription>Top merchants by net spending.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <TotalsTable nameHeader="Merchant" total={totalExpense} rows={rows.map((m) => ({ key: m.merchant, name: m.merchant, total: Number(m.total), count: Number(m.tx_count) }))} />
      </CardContent>
    </Card>
  );
}

export function PaymentMethodTotalsTable({ rows, totalExpense }: { rows: PaymentMethodTotal[]; totalExpense: number }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">Payment-method totals</CardTitle>
        <CardDescription>How you paid for net spending.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <TotalsTable
          nameHeader="Payment method"
          total={totalExpense}
          rows={rows.map((p) => ({ key: p.payment_method, name: PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method, total: Number(p.total), count: Number(p.tx_count) }))}
        />
      </CardContent>
    </Card>
  );
}
