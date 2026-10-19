import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Info } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/finance/dates";
import { listOccurrences, listPendingOccurrences, listRecurring } from "@/lib/data/recurring";
import { listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { formatINR } from "@/lib/finance/money";
import { formatDisplayDate } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { RecurringList } from "@/components/recurring/recurring-list";
import { NewRecurringButton } from "@/components/recurring/new-recurring-button";
import { ProcessDueButton } from "@/components/recurring/process-due-button";
import { PendingOccurrences } from "@/components/recurring/pending-occurrences";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Recurring" };

export default async function RecurringPage() {
  const { timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const [schedules, pending, occurrences, accounts, categories] = await Promise.all([
    listRecurring(),
    listPendingOccurrences(),
    listOccurrences(undefined, 50),
    listAccounts(),
    listCategories(),
  ]);
  const dueCount = schedules.filter((s) => s.status === "active" && s.next_due_date <= today).length;
  const scheduleById = new Map(schedules.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recurring transactions"
        description="Rent, bills, subscriptions, EMIs and salary — generated on schedule, exactly once per due date."
        actions={
          <>
            <ProcessDueButton dueCount={dueCount} />
            <NewRecurringButton accounts={accounts} categories={categories} today={today} />
          </>
        }
      />

      {pending.length > 0 ? (
        <section aria-labelledby="pending-heading" className="flex flex-col gap-2">
          <h2 id="pending-heading" className="text-lg font-semibold">
            Waiting for your confirmation <Badge variant="secondary">{pending.length}</Badge>
          </h2>
          <PendingOccurrences occurrences={pending} schedules={schedules} today={today} />
        </section>
      ) : null}

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No recurring schedules"
          description="Add your rent, electricity bill, internet, insurance premium, loan EMI or salary once and let DhanDrashti create the entries on time."
          action={<NewRecurringButton accounts={accounts} categories={categories} today={today} />}
        />
      ) : (
        <RecurringList schedules={schedules} accounts={accounts} categories={categories} today={today} />
      )}

      <section aria-labelledby="history-heading" className="flex flex-col gap-2">
        <h2 id="history-heading" className="text-lg font-semibold">
          Past occurrences
        </h2>
        {occurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been generated yet.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.map((o) => {
                  const s = scheduleById.get(o.recurring_transaction_id);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="tabular">{formatDisplayDate(o.scheduled_date)}</TableCell>
                      <TableCell className="max-w-48 truncate">{s?.merchant || s?.note || "—"}</TableCell>
                      <TableCell className="text-right tabular">{s ? formatINR(s.amount) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "posted" ? "default" : o.status === "pending" ? "secondary" : "outline"} className="capitalize">
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {o.transaction_id ? (
                          <Link href={`/transactions/${o.transaction_id}`} className="text-sm underline underline-offset-4">
                            View
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Alert>
        <Info />
        <AlertTitle>How schedules work</AlertTitle>
        <AlertDescription>
          A daily scheduler (Vercel Cron) processes due schedules; you can also press “Process due now”. Opening pages never creates
          entries. Each due date is generated at most once — retries and double runs are safe. Missed dates are caught up (every missed
          occurrence is generated). Monthly and yearly schedules keep their day-of-month: a schedule on the 31st falls on the last day of
          shorter months and returns to the 31st afterwards. Auto-post schedules create transactions; reminder schedules notify you and wait
          for confirmation.
        </AlertDescription>
      </Alert>
    </div>
  );
}
