"use client";

import * as React from "react";
import { Check, SkipForward } from "lucide-react";
import { toast } from "sonner";
import type { OccurrenceRow, RecurringTransactionRow } from "@/lib/types/database";
import { confirmOccurrenceAction, skipOccurrenceAction } from "@/lib/actions/recurring";
import { formatINR } from "@/lib/finance/money";
import { formatDisplayDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function PendingOccurrences({ occurrences, schedules, today }: { occurrences: OccurrenceRow[]; schedules: RecurringTransactionRow[]; today: string }) {
  const byId = new Map(schedules.map((s) => [s.id, s]));
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {occurrences.map((o) => (
        <PendingRow key={o.id} occurrence={o} schedule={byId.get(o.recurring_transaction_id)} today={today} />
      ))}
    </ul>
  );
}

function PendingRow({ occurrence: o, schedule, today }: { occurrence: OccurrenceRow; schedule?: RecurringTransactionRow; today: string }) {
  const [pending, startTransition] = React.useTransition();
  const [date, setDate] = React.useState(o.scheduled_date <= today ? o.scheduled_date : today);
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {schedule?.merchant || schedule?.note || "Scheduled transaction"} · <span className="tabular">{schedule ? formatINR(schedule.amount) : ""}</span>
        </p>
        <p className="text-xs text-muted-foreground">Due {formatDisplayDate(o.scheduled_date)}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`occ-date-${o.id}`}>
          Post with date
        </label>
        <Input id={`occ-date-${o.id}`} type="date" value={date} max="9999-12-31" onChange={(e) => setDate(e.target.value)} className="w-40" />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await confirmOccurrenceAction(o.id, date);
              if (r.ok) toast.success(r.message ?? "Posted");
              else toast.error(r.error);
            })
          }
        >
          {pending ? <Spinner /> : <Check data-icon="inline-start" />}
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await skipOccurrenceAction(o.id);
              if (r.ok) toast.success(r.message ?? "Skipped");
              else toast.error(r.error);
            })
          }
        >
          <SkipForward data-icon="inline-start" /> Skip
        </Button>
      </div>
    </li>
  );
}
