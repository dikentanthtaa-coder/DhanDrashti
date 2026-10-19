import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { RecurringTransactionRow } from "@/lib/types/database";
import { formatDisplayDate } from "@/lib/finance/dates";
import { formatINR } from "@/lib/finance/money";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";

export function UpcomingRecurring({ items, today }: { items: RecurringTransactionRow[]; today: string }) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Upcoming recurring</CardTitle>
        <Button asChild variant="ghost" size="sm" className="no-print">
          <Link href="/recurring">Manage</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        {items.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing due in the next 30 days" description="Set up rent, bills or salary as recurring schedules." />
        ) : (
          <ul className="divide-y">
            {items.map((r) => {
              const overdue = r.next_due_date < today;
              return (
                <li key={r.id} className="flex items-center gap-3 px-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.merchant || r.note || `${FREQUENCY_LABELS[r.frequency]} ${r.transaction_type}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[r.frequency]} · due {formatDisplayDate(r.next_due_date)}
                      {r.posting_mode === "reminder" ? " · reminder" : ""}
                    </div>
                  </div>
                  {overdue ? <Badge variant="destructive">Due</Badge> : null}
                  <div className="tabular text-sm font-medium">{formatINR(r.amount)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
